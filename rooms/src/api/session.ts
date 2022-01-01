import { CloseCode, CloseMessage } from "./close-event";

export function createSessionTimeout(ms: number, ws: WebSocket) {
  return setTimeout(() => {
    ws.close(CloseCode.SessionTimedOut, CloseMessage.SessionTimedOut);
  }, ms + 1500);
}

export function createIdentifyTimeout(ms: number, ws: WebSocket) {
  return setTimeout(() => {
    ws.close(
      CloseCode.AuthenticationTimedOut,
      CloseMessage.AuthenticationTimedOut
    );
  }, ms + 1500);
}
