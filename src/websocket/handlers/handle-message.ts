import type { Codec, NatsConnection } from "nats";
import { z } from "zod";
import type { MyceliumWebSocket } from "../../types";

import { redis } from "../../util/redis";
import { jsonSchema } from "../../util/schemas";
import {
  channelNameSchema,
  makeChannelName,
  validateChannelCapability,
} from "../channels";

interface Params {
  webSocket: MyceliumWebSocket;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  data: any;
  nc: NatsConnection;
  sc: Codec<unknown>;
}

const dataSchema = z
  .object({
    type: z.literal("message"),
    channel: channelNameSchema,
    data: jsonSchema,
  })
  .strict();

export async function handleMessage({
  webSocket,
  webSocketsChannels,
  data,
  nc,
  sc,
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
        type: "messageError",
        errors: [
          "You can't send messages on channels you're not subscribed to",
        ],
      })
    );
  }

  if (
    !validateChannelCapability(
      "message",
      payload.channel,
      webSocket.auth.capabilities
    )
  ) {
    return webSocket.send(
      JSON.stringify({
        type: "messageError",
        message:
          "Your capabilities don't allow sending messages on this channel",
      })
    );
  }

  nc.publish(
    "message",
    sc.encode({
      channel,
      webSocketId: webSocket.id,
      data: data.data,
    })
  );
}
