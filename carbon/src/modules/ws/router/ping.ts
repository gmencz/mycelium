import {
  makeServerToChannelMessage,
  makeServerToClientMessage,
  ServerToChannelOpCode,
  ServerToClientOpCode,
} from "../protocol";

export const clientPing = (
  server: WebSocket,
  channels: Map<string, WebSocket>
) => {
  server.send(
    makeServerToClientMessage({
      opCode: ServerToClientOpCode.Pong,
    }) as string
  );

  channels.forEach((webSocket) => {
    if (webSocket.readyState === WebSocket.READY_STATE_OPEN) {
      webSocket.send(
        makeServerToChannelMessage({
          opCode: ServerToChannelOpCode.Ping,
        })
      );
    }
  });
};
