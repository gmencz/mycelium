import { identify } from "dog";
import { CloseCode, CloseMessage } from "./api/close-event";
import {
  HeartbeatACKMessage,
  HelloMessage,
  identifySchema,
  joinRoomSchema
} from "./api/message";
import { SendOpCode } from "./api/op-code";
import { decodePayload } from "./api/payload";
import { createIdentifyTimeout, createSessionTimeout } from "./api/session";
import { Bindings } from "./types";
import { uuid } from "@cfworker/uuid";
import { getAppSigningKey } from "./app";

export { Lobby } from "./lobby";
export { Room } from "./room";

const HEARTBEAT_INTERVAL = 300000; // 5 minutes
const IDENTIFY_INTERVAL = 15000; // 15 seconds

function generateWebSocketKey(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

function hexStringToArrayBuffer(str: string) {
  const hexString = str.replace(/^0x/, "");

  if (hexString.length % 2 != 0) {
    return;
  }

  if (hexString.match(/[G-Z\s]/i)) {
    return;
  }

  const pairs = hexString.match(/[\dA-F]{2}/gi);
  if (!pairs) {
    return;
  }

  return new Uint8Array(pairs.map(s => parseInt(s, 16))).buffer;
}

const worker: ModuleWorker<Bindings> = {
  fetch: async (req, env, ctx) => {
    const upgradeHeader = req.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    const sid = uuid();
    let sessionTimeoutHandle = createSessionTimeout(HEARTBEAT_INTERVAL, server);
    let hasIdentified = false;
    const identifyTimeoutHandle = createIdentifyTimeout(
      IDENTIFY_INTERVAL,
      server
    );

    server.addEventListener("message", async message => {
      let payload;
      try {
        payload = decodePayload(message.data);
      } catch (error) {
        console.error(error);
        server.close(CloseCode.DecodeError, CloseMessage.DecodeError);
        return;
      }

      clearTimeout(sessionTimeoutHandle);
      sessionTimeoutHandle = createSessionTimeout(HEARTBEAT_INTERVAL, server);

      switch (payload.op) {
        case SendOpCode.Heartbeat: {
          if (!hasIdentified) {
            server.close(
              CloseCode.NotAuthenticated,
              CloseMessage.NotAuthenticated
            );
            return;
          }

          server.send(new HeartbeatACKMessage().toJSON());
          return;
        }

        case SendOpCode.Identify: {
          if (hasIdentified) {
            server.close(
              CloseCode.AlreadyAuthenticated,
              CloseMessage.AlreadyAuthenticated
            );
            return;
          }

          // DO the identify
          let data;
          try {
            data = identifySchema.parse(payload.d);
          } catch (error) {
            server.close(CloseCode.DecodeError, CloseMessage.DecodeError);
            return;
          }

          const { appId, signature } = data;
          const appSigningKey = await getAppSigningKey(appId);
          const encoder = new TextEncoder();
          const signatureBuffer = hexStringToArrayBuffer(signature);

          if (!signatureBuffer) {
            server.close(
              CloseCode.AuthenticationFailed,
              CloseMessage.AuthenticationFailed
            );
            return;
          }

          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(appSigningKey),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
          );

          const verified = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBuffer,
            encoder.encode(`${sid}`)
          );

          if (!verified) {
            server.close(
              CloseCode.AuthenticationFailed,
              CloseMessage.AuthenticationFailed
            );
            return;
          }

          server.send("LETS GO BOYS");

          clearTimeout(identifyTimeoutHandle);
          hasIdentified = true;
          return;
        }

        case SendOpCode.JoinRoom: {
          if (!hasIdentified) {
            server.close(
              CloseCode.NotAuthenticated,
              CloseMessage.NotAuthenticated
            );
            return;
          }

          let data;
          try {
            data = joinRoomSchema.parse(payload.d);
          } catch (error) {
            server.close(CloseCode.DecodeError, CloseMessage.DecodeError);
            return;
          }

          // A Lobby groups all of the Room replicas.
          const group = env.LOBBY.idFromName(data.name);

          const userId = "";

          const replica = await identify(group, userId, {
            parent: env.LOBBY,
            child: env.ROOM
          });

          const response = await replica.fetch("https://room.replica/ws", {
            headers: {
              Connection: "Upgrade",
              Upgrade: "websocket",
              "Sec-WebSocket-Key": btoa(generateWebSocketKey(16)),
              "Sec-WebSocket-Version": "13",
              "Sec-WebSocket-Extensions":
                "permessage-deflate; client_max_window_bits"
            }
          });

          return;
        }

        default: {
          // Unknown op code so close the connection.
          server.close(CloseCode.UnknownOpCode, CloseMessage.UnknownOpCode);
          return;
        }
      }
    });

    server.send(new HelloMessage({ sid }).toJSON());

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
};

export default worker;
