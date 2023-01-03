import { Group, Replica, Bindings as DogBindings } from "dog";
import { Context } from "hono";

export interface Bindings extends DogBindings {
  APPS: KVNamespace;
  CHANNEL_GROUP: DurableObjectNamespace & Group<Bindings>;
  CHANNEL: DurableObjectNamespace & Replica<Bindings>;
}

export type RouterContext = Context<
  string,
  {
    Bindings: Bindings;
  },
  unknown
>;
