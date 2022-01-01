import { Group } from "dog";
import type { Bindings } from "../types";

export class Lobby extends Group<Bindings> {
  limit = 100;

  link(env: Bindings) {
    return {
      child: env.ROOM,
      self: env.LOBBY
    };
  }
}
