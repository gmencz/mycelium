import type { Codec, NatsConnection } from "nats";
import type { MyceliumWebSocket } from "../types";

interface Params {
  nc: NatsConnection;
  sc: Codec<unknown>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
}

export async function subscribeToMessages({
  nc,
  sc,
  channelsWebSockets,
}: Params) {
  const sub = nc.subscribe("message");

  for await (const m of sub) {
    const data: any = sc.decode(m.data);
    const webSockets = channelsWebSockets.get(data.channel);
    if (webSockets) {
      const message = JSON.stringify({
        type: "message",
        channel: data.channel.split(":")[1],
        data: data.data,
      });

      if (data.webSocketId) {
        webSockets.forEach((webSocket) => {
          if (webSocket.id !== data.webSocketId) {
            webSocket.send(message);
          }
        });
      } else {
        webSockets.forEach((webSocket) => {
          webSocket.send(message);
        });
      }
    }
  }
}
