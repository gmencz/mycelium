import { Context } from "@/bindings";
import { App } from "../apps";
import { handleClientMessage } from "./message";
import { makeServerToClientMessage, ServerToClientOpCode } from "./protocol";

export const startSession = async (server: WebSocket, app: App, c: Context) => {
  // The channels to which the client is subscribed to.
  const channels = new Map<string, WebSocket>();

  // Intervals that need to be cleared on disconnect.
  const intervals = new Map<string, number>();

  const endSession = () => {
    intervals.forEach(clearInterval);
    channels.forEach((webSocket) => {
      webSocket.close();
    });
  };

  server.addEventListener("close", endSession);
  server.addEventListener("error", endSession);
  server.addEventListener("message", (event) => {
    handleClientMessage(event, server, app, c, channels, intervals);
  });

  const connectedMessage = makeServerToClientMessage({
    opCode: ServerToClientOpCode.Connected,
  });

  server.send(connectedMessage);
};
