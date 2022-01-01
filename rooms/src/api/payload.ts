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
  null as nullable
} from "zod";

type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = union([string(), number(), boolean(), nullable()]);
const jsonSchema: ZodSchema<Json> = lazy(() =>
  union([literalSchema, array(jsonSchema), record(jsonSchema)])
);

const payloadSchema = object({
  op: number(),
  d: optional(jsonSchema)
});

export function decodePayload(raw: any) {
  return payloadSchema.parse(JSON.parse(raw));
}
