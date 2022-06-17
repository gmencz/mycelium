import type { MyceliumWebSocket } from "../../types";

import { redis } from "../../util/redis";

interface Params {
  webSocket: MyceliumWebSocket;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
}

export async function handleClose({
  channelsWebSockets,
  webSocketsChannels,
  webSocket,
}: Params) {
  const channels = webSocketsChannels.get(webSocket);
  if (channels) {
    await Promise.all(
      [...channels].map(async (channel) => {
        const key = `subscribers:${channel}`;
        const channelExists = await redis.exists(key);
        if (channelExists) {
          const subscribersLeft = await redis.decr(key);
          if (subscribersLeft === 0) {
            await redis.del(key);
          }
        }

        channelsWebSockets.set(
          channel,
          (channelsWebSockets.get(channel) || []).filter(
            ({ id }) => id !== webSocket.id
          )
        );
      })
    );
    webSocketsChannels.delete(webSocket);
  }
}
