import { Replica, Socket } from "dog";
import type { Bindings } from "./types";

export class Room extends Replica<Bindings> {
  clients = [];

  link(env: Bindings) {
    return {
      parent: env.LOBBY,
      self: env.ROOM
    };
  }

  async receive(req: Request) {
    console.log("[ HELLO ][receive] req.url", req.url);

    const { pathname } = new URL(req.url);

    if (pathname === "/ws") {
      return this.connect(req);
    }

    return new Response(`Not found`, {
      status: 404
    });
  }

  onopen(socket: Socket) {
    console.log({ socket });
  }
}
