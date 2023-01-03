import { z } from "zod";

export const clientPublishSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
  m: z.string().max(1e7), // Message. 10MB max
});

export type ClientPublish = z.TypeOf<typeof clientPublishSchema>;

export const clientPublish = (data: ClientPublish) => {
  // TODO
};
