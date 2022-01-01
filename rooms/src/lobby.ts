import { Group } from "dog";
import type { Bindings } from "./types";

export class Lobby extends Group<Bindings> {
  limit = 10; // max conns per REPLICA stub

  link(env: Bindings) {
    return {
      child: env.ROOM,
      self: env.LOBBY
    };
  }
}
