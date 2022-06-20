import { z } from "zod";
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

const dataSchema = z
  .object({
    type: z.literal("unsubscribe"),
    channel: channelNameSchema,
  })
  .strict();

export async function handleUnsubscribe({
  webSocket,
  webSocketsChannels,
  channelsWebSockets,
  data,
}: Params) {
  let payload;
  try {
    payload = dataSchema.parse(data);
  } catch (error) {
    return webSocket.send(
      JSON.stringify({
        type: "error",
        errors: ["Invalid payload"],
      })
    );
  }

  const channel = makeChannelName(payload.channel, webSocket.auth.appId);
  const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
  if (!isSubscribed) {
    return webSocket.send(
      JSON.stringify({
        type: "subscriptionError",
        errors: ["You're not subscribed to this channel"],
      })
    );
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

  return webSocket.send(
    JSON.stringify({
      type: "unsubscriptionSuccess",
      channel: payload.channel,
    })
  );
}
