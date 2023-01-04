import { Bindings } from "@/bindings";
import { Message, Replica, Socket } from "dog";
import { z } from "zod";
import { User, userSchema } from "../auth";
import {
  makeServerToClientMessage,
  ServerToChannelOpCode,
  ServerToClientOpCode,
} from "../ws/protocol";

const messageSchema = z.object({
  op: z.nativeEnum(ServerToChannelOpCode),
  d: z
    .union([
      z.object({ u: userSchema.nullable() }),
      z.object({ m: z.string() }),
    ])
    .optional(),
});

const helloMessageSchema = z.object({
  u: userSchema.nullable(),
});

const broadcastMessageSchema = z.object({
  m: z.string(),
});

export class Channel extends Replica<Bindings> {
  #user: User | null = null;
  #connections: number = 0;

  link(env: Bindings) {
    return {
      parent: env.CHANNEL_GROUP,
      self: env.CHANNEL,
    };
  }

  async onclose(socket: Socket) {
    this.#connections--;
    if (this.#connections === 0) {
      const message = makeServerToClientMessage(
        {
          opCode: ServerToClientOpCode.UserUnsubscribed,
          data: {
            u: this.#user || "anon",
          },
        },
        false
      );

      // Let everyone know a user unsubscribed.
      socket.broadcast(message as Message, true);
    }
  }

  async onmessage(socket: Socket, data: string) {
    let message;
    try {
      message = messageSchema.parse(JSON.parse(data));
    } catch (error) {
      console.error(
        `[Channel replica ${socket.uid}] -> Invalid message received`
      );
      return;
    }

    switch (message.op) {
      case ServerToChannelOpCode.Hello: {
        let helloData;
        try {
          helloData = helloMessageSchema.parse(message.d);
        } catch (error) {
          console.error(
            `[Channel replica ${socket.uid}] -> Invalid 'hello' message received`
          );
          return;
        }

        this.#connections++;
        this.#user = helloData.u;

        // Let everyone know only on the first connection.
        if (this.#connections === 1) {
          const newMessage = makeServerToClientMessage(
            {
              opCode: ServerToClientOpCode.UserSubscribed,
              data: {
                u: this.#user || "anon",
              },
            },
            false
          );

          // Let everyone know a user subscribed.
          socket.broadcast(newMessage as Message, true);
        }

        break;
      }

      case ServerToChannelOpCode.Broadcast: {
        let broadcastData;
        try {
          broadcastData = broadcastMessageSchema.parse(message.d);
        } catch (error) {
          console.error(
            `[Channel replica ${socket.uid}] -> Invalid 'broadcast' message received`
          );
          return;
        }

        const newMessage = makeServerToClientMessage(
          {
            opCode: ServerToClientOpCode.ReceivedMessage,
            data: {
              m: broadcastData.m,
            },
          },
          false
        );

        socket.broadcast(newMessage as Message, true);

        break;
      }

      case ServerToChannelOpCode.Ping: {
        // Do nothing, this is just to keep the replica alive.
        console.log(`[Channel replica ${socket.uid}] -> Pong`);
        break;
      }

      default: {
        console.error("[Channel replica] -> Unknown message op code received");
        return;
      }
    }
  }

  receive(req: Request) {
    const { pathname } = new URL(req.url);
    if (pathname === "/ws") return this.connect(req);
    return new Response("Invalid", { status: 404 });
  }
}
