import {
  number,
  object,
  null as nullable,
  boolean,
  string,
  union,
  ZodSchema,
  array,
  lazy,
  record
} from "zod";

type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];

const literalSchema = union([string(), number(), boolean(), nullable()]);

const jsonSchema: ZodSchema<Json> = lazy(() =>
  union([literalSchema, array(jsonSchema), record(jsonSchema)])
);

const schema = object({
  op: number(),
  d: jsonSchema.optional()
});

const parseMessage = (message: any) => {
  return schema.parse(message);
};

export { parseMessage, Json, Literal, literalSchema, jsonSchema };
