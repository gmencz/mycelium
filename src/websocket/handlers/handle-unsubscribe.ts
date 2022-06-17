import type { MyceliumWebSocket } from "../../types";

import { redis } from "../../util/redis";
import {
  channelNameSchema,
  makeChannelName,
  validateChannelCapability,
} from "../channels";

interface Params {
  webSocket: MyceliumWebSocket;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
  data: any;
}

export async function handleUnsubscribe({
  webSocket,
  webSocketsChannels,
  channelsWebSockets,
  data,
}: Params) {
  let channel;
  try {
    channel = makeChannelName(
      channelNameSchema.parse(data.channel),
      webSocket.auth.appId
    );
  } catch (error) {
    webSocket.send(
      JSON.stringify({
        type: "unsubscriptionError",
        message: "Invalid channel name",
      })
    );

    return;
  }

  const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
  if (!isSubscribed) {
    return;
  }

  webSocketsChannels.get(webSocket)?.delete(channel);

  channelsWebSockets.set(
    channel,
    (channelsWebSockets.get(channel) || []).filter(
      ({ id }) => id !== webSocket.id
    )
  );

  const key = `subscribers:${channel}`;
  const subscribersLeft = await redis.decr(key);
  if (subscribersLeft === 0) {
    await redis.del(key);
  }
}
