import { HeartbeatACKMessage } from "../heartbeat-ack";

const handleHeartbeatMessage = (webSocket: WebSocket) => {
  return webSocket.send(new HeartbeatACKMessage().toJSON());
};

export { handleHeartbeatMessage };
