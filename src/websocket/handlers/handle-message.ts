import type { Codec, NatsConnection } from "nats";
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
  data: any;
  nc: NatsConnection;
  sc: Codec<unknown>;
}

export async function handleMessage({
  webSocket,
  webSocketsChannels,
  data,
  nc,
  sc,
}: Params) {
  let channelName: string;
  try {
    channelName = channelNameSchema.parse(data.channel);
  } catch (error) {
    webSocket.send(
      JSON.stringify({
        type: "messageError",
        message: "Invalid channel name",
      })
    );

    return;
  }

  const channel = makeChannelName(channelName, webSocket.auth.appId);
  const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
  if (!isSubscribed) {
    // can only send messages on channels you're subscribed to.
    return;
  }

  if (
    !validateChannelCapability(
      "message",
      channelName,
      webSocket.auth.capabilities
    )
  ) {
    return webSocket.send(
      JSON.stringify({
        type: "messageError",
        message:
          "Your capabilities don't allow sending messages to this channel",
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
