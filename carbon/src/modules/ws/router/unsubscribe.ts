import { z } from "zod";
import {
  CloseCode,
  makeServerToChannelMessage,
  ServerToChannelOpCode,
} from "../protocol";

export const clientUnsubscribeSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
});

export type ClientUnsubscribe = z.TypeOf<typeof clientUnsubscribeSchema>;

export const clientUnsubscribe = async (
  data: ClientUnsubscribe,
  server: WebSocket,
  channels: Map<string, WebSocket>
) => {
  try {
    clientUnsubscribeSchema.parse(data);
  } catch (error) {
    return server.close(CloseCode.INVALID_MESSAGE_DATA);
  }

  const channel = channels.get(data.c);
  if (!channel) {
    return server.close(CloseCode.NOT_SUBSCRIBED_TO_CHANNEL);
  }

  channel.close();
  channels.delete(data.c);
};
