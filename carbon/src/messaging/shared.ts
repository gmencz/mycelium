import { z } from "zod";

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof literalSchema>;

type Json = Literal | { [key: string]: Json } | Json[];

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const userSchema = z.object({
  id: z.string(),
  details: jsonSchema.optional(),
});

export type User = z.TypeOf<typeof userSchema>;

export const closeEvents = {
  MISSING_APP_ID: {
    code: 4000,
    message: "Missing app id",
  },
  INVALID_APP_ID: {
    code: 4001,
    message: "Invalid app id",
  },
  INVALID_MESSAGE: {
    code: 4002,
    message: "Invalid message",
  },
  INVALID_MESSAGE_DATA: {
    code: 4003,
    message: "Invalid message data",
  },
  FAILED_TO_CONNECT_TO_REPLICA: {
    code: 4004,
    message: "Internal error connecting to channel replica",
  },
  INVALID_USER_TOKEN: {
    code: 4005,
    message: "Invalid user token",
  },
  INTERNAL_SERVER_ERROR: {
    code: 4006,
    message: "Internal server error",
  },
  NOT_SUBSCRIBED: {
    code: 4007,
    message: "You're not subscribed to this channel",
  },
};
