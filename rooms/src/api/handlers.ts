import { identify as identifyReplica } from "dog";
import { CloseCode, CloseMessage } from "./codes";
import { Bindings } from "../types";
import { getAppSigningKey } from "../utils/app";
import { verifySignature } from "../utils/crypto";
import { generateSecWebSocketKey } from "../utils/ws-protocol";
import { HeartbeatACKMessage, IdentifySuccessMessage } from "./message";
import { decodePayload, identifySchema, joinRoomSchema } from "./schemas";

export function heartbeat(ws: WebSocket, hasIdentified: boolean) {
  if (!hasIdentified) {
    ws.close(CloseCode.NotAuthenticated, CloseMessage.NotAuthenticated);
    return;
  }

  ws.send(new HeartbeatACKMessage().toJSON());
}

export async function identify(
  ws: WebSocket,
  hasIdentified: boolean,
  payload: ReturnType<typeof decodePayload>,
  sid: string
) {
  if (hasIdentified) {
    ws.close(CloseCode.AlreadyAuthenticated, CloseMessage.AlreadyAuthenticated);
    return;
  }

  let data;
  try {
    data = identifySchema.parse(payload.d);
  } catch (error) {
    ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
    return;
  }

  const { app, sig } = data;
  const appSigningKey = await getAppSigningKey(app);
  const verified = await verifySignature(`${sid}`, sig, appSigningKey);

  if (!verified) {
    ws.close(CloseCode.AuthenticationFailed, CloseMessage.AuthenticationFailed);
    return;
  }

  ws.send(new IdentifySuccessMessage().toJSON());
  return app;
}

export async function joinRoom(
  ws: WebSocket,
  hasIdentified: boolean,
  payload: ReturnType<typeof decodePayload>,
  env: Bindings,
  app: string | undefined,
  req: Request
) {
  if (!hasIdentified || !app) {
    ws.close(CloseCode.NotAuthenticated, CloseMessage.NotAuthenticated);
    return;
  }

  let data;
  try {
    data = joinRoomSchema.parse(payload.d);
  } catch (error) {
    ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
    return;
  }

  const lobbyName = `${app}::${data.name}`;
  const lobby = env.LOBBY.idFromName(lobbyName);
  const room = await identifyReplica(lobby, req.cf.colo, {
    parent: env.LOBBY,
    child: env.ROOM
  });

  const response = await room.fetch(`https://${lobbyName}/ws`, {
    headers: {
      Connection: "Upgrade",
      Upgrade: "websocket",
      "Sec-WebSocket-Key": btoa(generateSecWebSocketKey(16)),
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
    }
  });
}
