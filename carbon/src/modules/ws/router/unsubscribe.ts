import { z } from "zod";
import { CloseCode } from "../protocol";

export const clientUnsubscribeSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
});

export type ClientUnsubscribe = z.TypeOf<typeof clientUnsubscribeSchema>;

export const clientUnsubscribe = (
  data: ClientUnsubscribe,
  server: WebSocket,
  channels: Map<string, WebSocket>,
  intervals: Map<string, number>
) => {
  try {
    clientUnsubscribeSchema.parse(data);
  } catch (error) {
    return server.close(CloseCode.INVALID_MESSAGE_DATA);
  }

  // TODO
};
