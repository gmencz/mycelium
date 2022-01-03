import { uuid } from "@cfworker/uuid";
import { CloseCode, CloseMessage } from "./codes";
import { Bindings } from "../types";
import { SendOpCode } from "./codes";
import { heartbeat, identify, joinRoom } from "./handlers";
import { HelloMessage } from "./message";
import { decodePayload } from "./schemas";
import {
  HEARTBEAT_MS,
  MS_TO_ACCOUNT_FOR_LATENCY,
  MS_TO_IDENTIFY_BEFORE_TIMEOUT
} from "../constants";

export function handleSession(ws: WebSocket, req: Request, env: Bindings) {
  // Create a unique id for the session. This will be used for authentication.
  const sid = uuid();
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
        return heartbeat(ws, hasIdentified);
      }

      case SendOpCode.Identify: {
        app = await identify(ws, hasIdentified, payload, sid, env);

        if (app) {
          clearTimeout(identifyTimeoutHandle);
          hasIdentified = true;
        }

        return;
      }

      case SendOpCode.JoinRoom: {
        await joinRoom(ws, hasIdentified, payload, env, app, req);
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

function createCloseTimeout(
  ms: number,
  ws: WebSocket,
  closeCode: CloseCode,
  closeMessage: CloseMessage
) {
  return setTimeout(() => {
    ws.close(closeCode, closeMessage);
  }, ms + MS_TO_ACCOUNT_FOR_LATENCY);
}
