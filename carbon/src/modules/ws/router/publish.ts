import { z } from "zod";
import {
  CloseCode,
  makeServerToChannelMessage,
  ServerToChannelOpCode,
} from "../protocol";

export const clientPublishSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
  m: z.string().max(1e7), // Message. 10MB max
});

export type ClientPublish = z.TypeOf<typeof clientPublishSchema>;

export const clientPublish = (
  data: ClientPublish,
  server: WebSocket,
  channels: Map<string, WebSocket>
) => {
  try {
    clientPublishSchema.parse(data);
  } catch (error) {
    return server.close(CloseCode.INVALID_MESSAGE_DATA);
  }

  const channel = channels.get(data.c);
  if (!channel) {
    return server.close(CloseCode.NOT_SUBSCRIBED_TO_CHANNEL);
  }

  const broadcastMessage = makeServerToChannelMessage({
    opCode: ServerToChannelOpCode.Broadcast,
    data: {
      m: data.m,
    },
  });

  channel.send(broadcastMessage);
};
