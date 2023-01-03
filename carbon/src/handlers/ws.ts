import {
  externalMessageSchema,
  externalPublishSchema,
  externalSubscribeSchema,
  ListChannelsMessage,
  SessionStartMessage,
} from "@/messaging/external";
import { closeEvents, User } from "@/messaging/shared";
import { Bindings } from "@/types";
import { Context } from "hono";
import { z } from "zod";
import { App } from "./apps";
import { identify } from "dog";
import { getUserFromJWT } from "@/utils/get-user-from-jwt";
import { ToReplicaMessage } from "@/messaging/internal";

async function startSession(
  app: App,
  server: WebSocket,
  c: Context<
    string,
    {
      Bindings: Bindings;
    },
    unknown
  >
) {
  const sessionId = crypto.randomUUID();
  const channels = new Map<string, WebSocket>();

  const sessionStartMessage: SessionStartMessage = {
    sessionId,
  };

  server.send(JSON.stringify(sessionStartMessage));

  server.addEventListener("message", async (event) => {
    let message;
    try {
      message = externalMessageSchema.parse(JSON.parse(event.data as string));
    } catch (error) {
      return server.close(
        closeEvents.INVALID_MESSAGE.code,
        closeEvents.INVALID_MESSAGE.message
      );
    }

    if (message.type === "subscribe") {
      let subscribeData: z.TypeOf<typeof externalSubscribeSchema>;
      try {
        subscribeData = externalSubscribeSchema.parse(message.data);
      } catch (error) {
        return server.close(
          closeEvents.INVALID_MESSAGE_DATA.code,
          closeEvents.INVALID_MESSAGE_DATA.message
        );
      }

      const gid = c.env.CHANNEL_GROUP.idFromName(
        `${app.id}:${subscribeData.channel}`
      );

      let user: User | null = null;
      if (subscribeData.userToken) {
        try {
          user = await getUserFromJWT(subscribeData.userToken, app.signingKey);
        } catch (error) {
          return server.close(
            closeEvents.INVALID_USER_TOKEN.code,
            closeEvents.INVALID_USER_TOKEN.message
          );
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
        parent: c.env.CHANNEL_GROUP as any,
        child: c.env.CHANNEL as any,
      });

      const resp = await replica.fetch(c.req);
      const ws = resp.webSocket;
      if (!ws) {
        return server.close(
          closeEvents.FAILED_TO_CONNECT_TO_REPLICA.code,
          closeEvents.FAILED_TO_CONNECT_TO_REPLICA.message
        );
      }

      ws.accept();

      const pingInterval = setInterval(() => {
        const pingMessage: ToReplicaMessage = {
          type: "ping",
        };

        ws.send(JSON.stringify(pingMessage));
      }, 30_000);

      const cleanup = () => {
        clearInterval(pingInterval);
      };

      const handleErrorOrClose = () => {
        channels.delete(subscribeData.channel);
        cleanup();
      };

      const handleMessage = (message: MessageEvent) => {
        // Forward messages from replica to user as they are sent.
        server.send(message.data);
      };

      server.addEventListener("close", cleanup);
      server.addEventListener("error", cleanup);
      ws.addEventListener("error", handleErrorOrClose);
      ws.addEventListener("close", handleErrorOrClose);
      ws.addEventListener("message", handleMessage);

      const helloMessage: ToReplicaMessage = {
        type: "hello",
        data: {
          user,
        },
      };

      ws.send(JSON.stringify(helloMessage));
    } else if (message.type === "listChannels") {
      const listChannelsMessage: ListChannelsMessage = {
        channels: Array.from(channels.keys()),
      };

      return server.send(JSON.stringify(listChannelsMessage));
    } else if (message.type === "publish") {
      let publishData: z.TypeOf<typeof externalPublishSchema>;
      try {
        publishData = externalPublishSchema.parse(message.data);
      } catch (error) {
        return server.close(
          closeEvents.INVALID_MESSAGE_DATA.code,
          closeEvents.INVALID_MESSAGE_DATA.message
        );
      }

      const ws = channels.get(publishData.channel);
      if (!ws) {
        return server.close(
          closeEvents.NOT_SUBSCRIBED.code,
          closeEvents.NOT_SUBSCRIBED.message
        );
      }

      const broadcastMessage: ToReplicaMessage = {
        type: "hello",
        data: {
          message: publishData.message,
        },
      };

      ws.send(JSON.stringify(broadcastMessage));
    }
  });
}

export const get = async (
  c: Context<
    string,
    {
      Bindings: Bindings;
    },
    unknown
  >
) => {
  const upgradeHeader = c.req.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 406);
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();

  const appId = c.req.query("appId");
  if (!appId) {
    server.close(
      closeEvents.MISSING_APP_ID.code,
      closeEvents.MISSING_APP_ID.message
    );
  } else {
    const app = await c.env.APPS.get<App>(appId, { type: "json" });
    if (app) {
      startSession(app, server, c);
    } else {
      server.close(
        closeEvents.INVALID_APP_ID.code,
        closeEvents.INVALID_APP_ID.message
      );
    }
  }

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};
