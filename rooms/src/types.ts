import type { Group, Replica } from "dog";
import { Request as IttyRequest } from "itty-router";

export interface Bindings extends ModuleWorker.Bindings {
  LOBBY: DurableObjectNamespace & Group<Bindings>;
  ROOM: DurableObjectNamespace & Replica<Bindings>;
  APPS_KV: KVNamespace;
  DEV: string;
}

export type RouterRequest = IttyRequest & Request;

export interface App {
  signingKey: string;
}
