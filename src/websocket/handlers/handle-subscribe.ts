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

export async function handleSubscribe({
  webSocket,
  webSocketsChannels,
  channelsWebSockets,
  data,
}: Params) {
  let channel: string;
  try {
    channel = channelNameSchema.parse(data.channel);
  } catch (error) {
    return webSocket.send(
      JSON.stringify({
        type: "subscriptionError",
        message: "Invalid channel name",
      })
    );
  }

  const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
  if (isSubscribed) {
    return;
  }

  if (
    !validateChannelCapability(
      "subscribe",
      channel,
      webSocket.auth.capabilities
    )
  ) {
    return webSocket.send(
      JSON.stringify({
        type: "subscriptionError",
        message: "Your capabilities don't allow subscribing to this channel",
      })
    );
  }

  channel = makeChannelName(channel, webSocket.auth.appId);
  if (webSocketsChannels.has(webSocket)) {
    webSocketsChannels.get(webSocket)!.add(channel);
  } else {
    webSocketsChannels.set(webSocket, new Set([channel]));
  }

  if (channelsWebSockets.has(channel)) {
    channelsWebSockets.get(channel)!.push(webSocket);
  } else {
    channelsWebSockets.set(channel, [webSocket]);
  }

  await redis.incr(`subscribers:${channel}`);
}
