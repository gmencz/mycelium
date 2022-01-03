import {
  object,
  optional,
  union,
  string,
  number,
  boolean,
  lazy,
  ZodSchema,
  record,
  array,
  null as nullable,
  any
} from "zod";

type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = union([string(), number(), boolean(), nullable()]);
const jsonSchema: ZodSchema<Json> = lazy(() =>
  union([literalSchema, array(jsonSchema), record(jsonSchema)])
);

export const joinRoomSchema = object({
  name: string().regex(/[A-Za-z0-9_-]+/)
});

export const broadcastToRoomSchema = object({
  room: string().regex(/[A-Za-z0-9_-]+/),
  data: jsonSchema
});

export const identifySchema = object({
  app: string(), // The id of the app.
  sig: string() // The signature, created with the private app's signing key.
});

const payloadSchema = object({
  op: number(),
  d: optional(jsonSchema)
});

export const broadcastToClusterSchema = object({
  data: jsonSchema,
  sid: string()
});

export function decodePayload(raw: any) {
  return payloadSchema.parse(JSON.parse(raw));
}
