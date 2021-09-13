import { Client } from "~/bucket";
import { HeartbeatACKMessage } from "../heartbeat-ack";

const handleHeartbeatMessage = (client: Client) => {
  return client.webSocket.send(new HeartbeatACKMessage().toJSON());
};

export { handleHeartbeatMessage };
