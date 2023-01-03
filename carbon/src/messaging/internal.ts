import { z } from "zod";
import { externalSubscribeSchema } from "./external";
import { closeEvents, User, userSchema } from "./shared";

export const fromReplicaUserSubscribedSchema = z.object({
  user: userSchema.or(z.literal("anon")),
});

export const fromReplicaUserPublishedSchema = z.object({
  message: z.string(),
});

export const fromReplicaMessageSchema = z.object({
  type: z.enum(["user:subscribed", "user:published"]),
  data: fromReplicaUserSubscribedSchema
    .or(fromReplicaUserPublishedSchema)
    .optional(),
});

export type FromReplicaMessage = z.TypeOf<typeof fromReplicaMessageSchema>;

export const toReplicaHelloSchema = z.object({
  user: userSchema.nullable(),
});

export const toReplicaBroadcastSchema = z.object({
  message: z.string(),
});

export const toReplicaMessageSchema = z.object({
  type: z.enum(["hello", "ping", "broadcast"]),
  data: toReplicaHelloSchema.or(toReplicaBroadcastSchema).optional(),
});

export type ToReplicaMessage = z.TypeOf<typeof toReplicaMessageSchema>;
