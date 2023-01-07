import { Context as HonoContext } from "hono";

export interface Bindings {}

export type Context = HonoContext<
  string,
  {
    Bindings: Bindings;
  },
  unknown
>;
