import type { MyceliumWebSocket } from "../../types";

import { redis } from "../../util/redis";
import { z, ZodError } from "zod";
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
    type: z.literal("subscribe"),
    channel: channelNameSchema,
  })
  .strict();

export async function handleSubscribe({
  webSocket,
  webSocketsChannels,
  channelsWebSockets,
  data,
}: Params) {
  let payload;
  try {
    payload = dataSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const { _errors } = error.format();

      return webSocket.send(
        JSON.stringify({
          type: "error",
          errors: _errors,
        })
      );
    }

    return webSocket.send(
      JSON.stringify({
        type: "error",
        errors: ["Invalid payload"],
      })
    );
  }

  const isSubscribed = webSocketsChannels.get(webSocket)?.has(payload.channel);
  if (isSubscribed) {
    return webSocket.send(
      JSON.stringify({
        type: "subscriptionError",
        errors: ["You're already subscribed to this channel"],
      })
    );
  }

  if (
    !validateChannelCapability(
      "subscribe",
      payload.channel,
      webSocket.auth.capabilities
    )
  ) {
    return webSocket.send(
      JSON.stringify({
        type: "subscriptionError",
        errors: ["Your capabilities don't allow subscribing to this channel"],
      })
    );
  }

  const channel = makeChannelName(payload.channel, webSocket.auth.appId);
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
