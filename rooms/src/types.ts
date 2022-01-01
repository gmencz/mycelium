import type { Group, Replica } from "dog";

export interface Bindings extends ModuleWorker.Bindings {
  LOBBY: DurableObjectNamespace & Group<Bindings>;
  ROOM: DurableObjectNamespace & Replica<Bindings>;
}
