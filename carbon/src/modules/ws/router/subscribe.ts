import { Context } from "@/bindings";
import { App } from "@/modules/apps";
import { getUserFromJWT, User } from "@/modules/auth";
import { identify } from "dog";
import { z } from "zod";
import {
  CloseCode,
  makeServerToChannelMessage,
  ServerToChannelMessage,
  ServerToChannelOpCode,
  serverToChannelPingInterval,
} from "../protocol";

export const clientSubscribeSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
  ut: z.string().optional(), // User token (optional). If not provided, the user is anonymous.
});

export type ClientSubscribe = z.TypeOf<typeof clientSubscribeSchema>;

export const clientSubscribe = async (
  data: ClientSubscribe,
  server: WebSocket,
  app: App,
  c: Context,
  channels: Map<string, WebSocket>
) => {
  try {
    clientSubscribeSchema.parse(data);
  } catch (error) {
    return server.close(CloseCode.INVALID_MESSAGE_DATA);
  }

  const isAlreadySubscribed = channels.has(data.c);
  if (isAlreadySubscribed) {
    return server.close(CloseCode.ALREADY_SUBSCRIBED_TO_CHANNEL);
  }

  const gid = c.env.CHANNEL_GROUP.idFromName(`${app.id}:${data.c}`);

  let user: User | null = null;
  if (data.ut) {
    try {
      user = await getUserFromJWT(data.ut, app.secret);
    } catch (error) {
      return server.close(CloseCode.INVALID_USER_TOKEN);
    }
  }

  let reqid: string;
  if (user) {
    reqid = user.id;
  } else {
    const ip = c.req.headers.get("CF-Connecting-IP")!;
    reqid = ip;
  }

  const replica = await identify(gid, reqid, {
    parent: c.env.CHANNEL_GROUP,
    child: c.env.CHANNEL,
  });

  const resp = await replica.fetch(c.req);
  const ws = resp.webSocket;
  if (!ws) {
    return server.close(CloseCode.FAILED_TO_CONNECT_TO_REPLICA);
  }
  ws.accept();

  const handleErrorOrClose = () => {
    channels.delete(data.c);
  };

  const handleMessage = (message: MessageEvent) => {
    // Forward messages from replica to client as they are sent.
    server.send(message.data);
  };

  ws.addEventListener("error", handleErrorOrClose);
  ws.addEventListener("close", handleErrorOrClose);
  ws.addEventListener("message", handleMessage);

  const helloMessage = makeServerToChannelMessage({
    opCode: ServerToChannelOpCode.Hello,
    data: {
      u: user,
    },
  });

  ws.send(helloMessage);
  channels.set(data.c, ws);
};
