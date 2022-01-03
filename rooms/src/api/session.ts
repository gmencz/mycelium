import { uuid } from "@cfworker/uuid";
import { identify as identifyReplica, Socket } from "dog";
import { CloseCode, CloseMessage } from "./codes";
import { App, Bindings } from "../types";
import { SendOpCode } from "./codes";
import {
  HeartbeatACKMessage,
  HelloMessage,
  IdentifySuccessMessage,
  JoinRoomSuccessMessage
} from "./message";
import {
  broadcastToRoomSchema,
  decodePayload,
  identifySchema,
  joinRoomSchema
} from "./schemas";
import {
  HEARTBEAT_MS,
  MS_TO_ACCOUNT_FOR_LATENCY,
  MS_TO_IDENTIFY_BEFORE_TIMEOUT
} from "../constants";
import { generateSecWebSocketKey } from "../utils/ws-protocol";
import { z } from "zod";
import { verifySignature } from "../utils/crypto";

export function handleSession(ws: WebSocket, req: Request, env: Bindings) {
  const sid = uuid();
  const { colo } = req.cf;
  const roomsWss = new Map<string, WebSocket>();
  let hasIdentified = false;
  let app: string | undefined;

  let sessionTimeoutHandle = createCloseTimeout(
    HEARTBEAT_MS,
    ws,
    CloseCode.SessionTimedOut,
    CloseMessage.SessionTimedOut
  );

  const identifyTimeoutHandle = createCloseTimeout(
    MS_TO_IDENTIFY_BEFORE_TIMEOUT(!!env.DEV),
    ws,
    CloseCode.AuthenticationTimedOut,
    CloseMessage.AuthenticationTimedOut
  );

  ws.addEventListener("message", async message => {
    let payload;
    try {
      payload = decodePayload(message.data);
    } catch (error) {
      ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
      return;
    }

    if (!Object.values(SendOpCode).includes(payload.op)) {
      // Unknown op code so close the connection.
      ws.close(CloseCode.UnknownOpCode, CloseMessage.UnknownOpCode);
      return;
    }

    clearTimeout(sessionTimeoutHandle);
    sessionTimeoutHandle = createCloseTimeout(
      HEARTBEAT_MS,
      ws,
      CloseCode.SessionTimedOut,
      CloseMessage.SessionTimedOut
    );

    switch (payload.op) {
      case SendOpCode.Heartbeat: {
        if (!hasIdentified) {
          ws.close(CloseCode.NotAuthenticated, CloseMessage.NotAuthenticated);
          return;
        }

        ws.send(new HeartbeatACKMessage().toJSON());
        return;
      }

      case SendOpCode.Identify: {
        if (hasIdentified) {
          ws.close(
            CloseCode.AlreadyAuthenticated,
            CloseMessage.AlreadyAuthenticated
          );

          return;
        }

        let data;
        try {
          data = identifySchema.parse(payload.d);
        } catch (error) {
          ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
          return;
        }

        const { app: appId, sig } = data;
        const storedApp = await env.APPS_KV.get<App>(appId, { type: "json" });
        if (!storedApp) {
          ws.close(
            CloseCode.AuthenticationFailed,
            CloseMessage.AuthenticationFailed
          );
          return;
        }

        const verified = await verifySignature(
          `${sid}`,
          sig,
          storedApp.signingKey
        );

        if (!verified) {
          ws.close(
            CloseCode.AuthenticationFailed,
            CloseMessage.AuthenticationFailed
          );
          return;
        }

        ws.send(new IdentifySuccessMessage().toJSON());

        app = appId;
        clearTimeout(identifyTimeoutHandle);
        hasIdentified = true;

        return;
      }

      case SendOpCode.JoinRoom: {
        if (!hasIdentified || !app) {
          ws.close(CloseCode.NotAuthenticated, CloseMessage.NotAuthenticated);
          return;
        }

        let data: z.infer<typeof joinRoomSchema>;
        try {
          data = joinRoomSchema.parse(payload.d);
        } catch (error) {
          ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
          return;
        }

        if (roomsWss.has(data.name)) {
          return;
        }

        const lobbyName = `${app}::${data.name}`;
        const lobby = env.LOBBY.idFromName(lobbyName);
        const room = await identifyReplica(lobby, colo, {
          parent: env.LOBBY,
          child: env.ROOM
        });

        const response = await room.fetch(
          `https://${data.name}/ws?sid=${sid}`,
          {
            headers: {
              Connection: "Upgrade",
              Upgrade: "websocket",
              "Sec-WebSocket-Key": btoa(generateSecWebSocketKey(16)),
              "Sec-WebSocket-Version": "13",
              "Sec-WebSocket-Extensions":
                "permessage-deflate; client_max_window_bits"
            }
          }
        );

        const roomWs = response.webSocket;
        if (!roomWs) {
          ws.close(CloseCode.UnknownError, CloseMessage.UnknownError);
          return;
        }

        roomWs.accept();
        roomsWss.set(data.name, roomWs);

        roomWs.addEventListener("message", () => {
          // TODO
          console.log(`Got a message on room: ${data.name}`);
        });

        ws.send(new JoinRoomSuccessMessage({ name: data.name }).toJSON());
        return;
      }

      case SendOpCode.BroadcastToRoom: {
        if (!hasIdentified || !app) {
          ws.close(CloseCode.NotAuthenticated, CloseMessage.NotAuthenticated);
          return;
        }

        let data: z.infer<typeof broadcastToRoomSchema>;
        try {
          data = broadcastToRoomSchema.parse(payload.d);
        } catch (error) {
          ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
          return;
        }

        const roomWs = roomsWss.get(data.room);
        if (!roomWs) {
          ws.close(
            CloseCode.NotAMemberOfThisRoom,
            CloseMessage.NotAMemberOfThisRoom
          );
          return;
        }

        roomWs.send(
          JSON.stringify({
            op: SendOpCode.BroadcastToRoom,
            d: {
              data: data.data,
              sid
            }
          })
        );

        return;
      }

      default: {
        // Unknown op code so close the connection.
        ws.close(CloseCode.UnknownOpCode, CloseMessage.UnknownOpCode);
        return;
      }
    }
  });

  // Send a hello message to the client with data relevant to their session.
  ws.send(new HelloMessage({ sid }).toJSON());
}

export function createCloseTimeout(
  ms: number,
  ws: WebSocket | Socket,
  closeCode: CloseCode,
  closeMessage: CloseMessage
) {
  return setTimeout(() => {
    ws.close(closeCode, closeMessage);
  }, ms + MS_TO_ACCOUNT_FOR_LATENCY);
}
