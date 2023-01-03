import {
  FromReplicaMessage,
  toReplicaBroadcastSchema,
  toReplicaHelloSchema,
  toReplicaMessageSchema,
} from "@/messaging/internal";
import { closeEvents, User } from "@/messaging/shared";
import { Bindings } from "@/types";
import { Replica, Socket } from "dog";

export class Channel extends Replica<Bindings> {
  #user: User | null = null;

  link(env: Bindings) {
    return {
      parent: env.CHANNEL_GROUP as any,
      self: env.CHANNEL as any,
    };
  }

  async onmessage(socket: Socket, data: string) {
    let message;
    try {
      message = toReplicaMessageSchema.parse(JSON.parse(data));
    } catch (error) {
      return socket.close(
        closeEvents.INVALID_MESSAGE.code,
        closeEvents.INVALID_MESSAGE.message
      );
    }

    if (message.type === "hello") {
      let helloData;
      try {
        helloData = toReplicaHelloSchema.parse(message.data);
      } catch (error) {
        return socket.close(
          closeEvents.INVALID_MESSAGE_DATA.code,
          closeEvents.INVALID_MESSAGE_DATA.message
        );
      }

      let hadUser = !!this.#user;
      this.#user = helloData.user;
      if (!hadUser) {
        const output: FromReplicaMessage = {
          type: "user:subscribed",
          data: {
            user: this.#user || "anon",
          },
        };

        // Let everyone know a user subscribed.
        socket.broadcast(output, true);
      }
    } else if (message.type === "broadcast") {
      let broadcastData;
      try {
        broadcastData = toReplicaBroadcastSchema.parse(message.data);
      } catch (error) {
        return socket.close(
          closeEvents.INVALID_MESSAGE_DATA.code,
          closeEvents.INVALID_MESSAGE_DATA.message
        );
      }

      const output: FromReplicaMessage = {
        type: "user:published",
        data: {
          message: broadcastData.message,
        },
      };

      socket.broadcast(output, true);
    }
  }

  receive(req: Request) {
    const { pathname } = new URL(req.url);
    if (pathname === "/ws") return this.connect(req);
    return new Response("Invalid", { status: 404 });
  }
}
