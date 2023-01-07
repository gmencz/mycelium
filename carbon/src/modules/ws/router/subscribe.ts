import { Context } from "@/bindings";
import { App } from "@/modules/apps";
import { getUserFromJWT } from "@/modules/auth";
import { identify } from "dog";
import { z } from "zod";
import {
  CloseCode,
  makeServerToChannelMessage,
  ServerToChannelOpCode,
} from "../protocol";

export const clientSubscribeSchema = z.object({
  c: z.string().max(256, "Channel name is too long"), // Channel name
  ut: z.string().optional(), // User token (only for private channels)
});

export type ClientSubscribe = z.TypeOf<typeof clientSubscribeSchema>;

const isPrivateChannel = (channelName: string) =>
  channelName.startsWith("private-");

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

  let reqid: string | null;
  let helloMessage: string;
  const gid = c.env.CHANNEL_GROUP.idFromName(`${app.id}:${data.c}`);
  const isPrivate = isPrivateChannel(data.c);
  if (isPrivate) {
    if (!data.ut) {
      return server.close(CloseCode.MISSING_USER_TOKEN);
    }

    let user;
    try {
      user = await getUserFromJWT(data.ut, app.secret);
    } catch (error) {
      return server.close(CloseCode.INVALID_USER_TOKEN);
    }

    reqid = user.id;
    helloMessage = makeServerToChannelMessage({
      opCode: ServerToChannelOpCode.Hello,
      data: {
        u: user,
      },
    });
  } else {
    reqid = c.req.headers.get("CF-Connecting-IP");
    helloMessage = makeServerToChannelMessage({
      opCode: ServerToChannelOpCode.Hello,
    });
  }

  if (!reqid) {
    return server.close(CloseCode.UNABLE_TO_OBTAIN_REQUEST_IDENTIFIER);
  }

  const replica = await identify(gid, reqid, {
    parent: c.env.CHANNEL_GROUP,
    child: c.env.CHANNEL,
  });

  console.log({ replicaId: replica.id.toString(), reqid });

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

  ws.send(helloMessage);
  channels.set(data.c, ws);
};
