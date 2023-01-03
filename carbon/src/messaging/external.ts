import { z } from "zod";

export const externalSubscribeSchema = z.object({
  channel: z.string().max(256, "Channel name is too long"),
  userToken: z.string().optional(),
});

export const externalPublishSchema = z.object({
  channel: z.string().max(256, "Channel name is too long"),
  message: z.string().max(1e7), // 10MB max
});

export const externalMessageSchema = z.object({
  type: z.enum(["subscribe", "listChannels", "publish"]),
  data: externalSubscribeSchema.optional(),
});

export interface SessionStartMessage {
  sessionId: string;
}

export interface ListChannelsMessage {
  channels: string[];
}
