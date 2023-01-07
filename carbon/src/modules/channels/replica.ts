import { Bindings } from "@/bindings";
import { Message, Replica, Socket } from "dog";
import { z } from "zod";
import { User, userSchema } from "../auth";
import {
  makeServerToClientMessage,
  ServerToChannelOpCode,
  ServerToClientOpCode,
} from "../ws/protocol";

const helloMessageSchema = z
  .object({
    u: userSchema.nullable(),
  })
  .optional();

const broadcastMessageSchema = z.object({
  m: z.string(),
});

const messageSchema = z.object({
  op: z.nativeEnum(ServerToChannelOpCode),
  d: z.union([helloMessageSchema, broadcastMessageSchema]).optional(),
});

export class Channel extends Replica<Bindings> {
  #users = new Map<string, User>();

  link(env: Bindings) {
    return {
      parent: env.CHANNEL_GROUP,
      self: env.CHANNEL,
    };
  }

  async onclose(socket: Socket) {
    const user = this.#users.get(socket.uid);
    if (user) {
      const message = makeServerToClientMessage(
        {
          opCode: ServerToClientOpCode.UserUnsubscribed,
          data: {
            u: user,
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

    console.log({ users: this.#users });

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

        const hadUser = this.#users.has(socket.uid);
        if (helloData?.u) {
          this.#users.set(socket.uid, helloData.u);
          if (!hadUser) {
            const newMessage = makeServerToClientMessage(
              {
                opCode: ServerToClientOpCode.UserSubscribed,
                data: {
                  u: helloData.u,
                },
              },
              false
            );

            // Let everyone know a new user subscribed.
            socket.broadcast(newMessage as Message, true);
          }
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

        let newMessage;
        const user = this.#users.get(socket.uid);
        if (user) {
          newMessage = makeServerToClientMessage(
            {
              opCode: ServerToClientOpCode.ReceivedMessage,
              data: {
                m: broadcastData.m,
                u: user,
              },
            },
            false
          );
        } else {
          newMessage = makeServerToClientMessage(
            {
              opCode: ServerToClientOpCode.ReceivedMessage,
              data: {
                m: broadcastData.m,
              },
            },
            false
          );
        }

        socket.broadcast(newMessage as Message, true);
        break;
      }

      case ServerToChannelOpCode.Ping: {
        // Do nothing, this is just to keep the replica alive.
        console.log(`[Channel replica ${socket.uid}] -> Pong`);
        break;
      }

      default: {
        console.error(
          `[Channel replica ${socket.uid}]] -> Unknown message op code received: ${message.op}`
        );
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
