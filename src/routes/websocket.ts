import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { JwtPayload } from "jsonwebtoken";
import type { Codec, NatsConnection } from "nats";

import type { MyceliumWebSocket } from "../types";

import { decode, verify } from "jsonwebtoken";
import { generate } from "shortid";
import { db } from "../util/db";
import { redis } from "../util/redis";

interface WebSocketRoute {
  Querystring: { appId?: string };
}

interface RouteContext {
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
  nc: NatsConnection;
  sc: Codec<unknown>;
}

// The "kid" (key identifier) should be the ID of an app.
async function getSigningKey(kid: string) {
  const app = await db.app.findUnique({
    where: { id: kid },
    select: { id: true, signingKey: true },
  });

  if (!app) {
    return;
  }

  return app.signingKey;
}

export async function routes(
  server: FastifyInstance,
  { webSocketsChannels, channelsWebSockets, nc, sc }: RouteContext
) {
  server.get<WebSocketRoute>("/", { websocket: true }, async (conn, req) => {
    const webSocket = conn.socket as unknown as MyceliumWebSocket;
    const { appId } = req.query;
    if (!appId) {
      webSocket.close(4001, "Missing appId");
      return;
    }

    const isValidAppId = await redis.sismember("apps", appId);
    if (!isValidAppId) {
      webSocket.close(4001, "Invalid appId");
      return;
    }

    webSocket.id = generate();
    webSocket.appId = appId;
    webSocketsChannels.set(webSocket, new Set());

    webSocket.on("close", async (code, message) => {
      const channels = webSocketsChannels.get(webSocket);
      if (channels) {
        await Promise.all(
          [...channels].map(async (channel) => {
            const key = `subscribers:${channel}`;
            const channelExists = await redis.exists(key);
            if (channelExists) {
              const subscribersLeft = await redis.decr(key);
              if (subscribersLeft === 0) {
                await redis.del(key);
              }
            }

            channelsWebSockets.set(
              channel,
              (channelsWebSockets.get(channel) || []).filter(
                ({ id }) => id !== webSocket.id
              )
            );
          })
        );
        webSocketsChannels.delete(webSocket);
      }
    });

    webSocket.on("message", async (message) => {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case "subscribe": {
          // Do NOT allow ":" on channel names.
          const channel = `${appId}:${data.channel}`;
          const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
          if (isSubscribed) {
            return;
          }

          if (channel.startsWith("private")) {
            const { token } = data;
            if (!token) {
              return;
            }

            const decoded = decode(token, { complete: true });
            if (!decoded) {
              return;
            }

            const { kid } = decoded.header;
            if (!kid) {
              return;
            }

            const signingKey = await getSigningKey(kid);
            if (!signingKey) {
              return;
            }

            let tokenPayload;
            try {
              tokenPayload = verify(token, signingKey) as JwtPayload;
            } catch (error) {
              return;
            }
          }

          if (webSocketsChannels.has(webSocket)) {
            webSocketsChannels.get(webSocket)!.add(channel);
          } else {
            webSocketsChannels.set(webSocket, new Set([channel]));
          }

          if (channelsWebSockets.has(channel)) {
            channelsWebSockets.get(channel)!.push(webSocket);
          } else {
            channelsWebSockets.set(channel, [webSocket]);
          }

          await redis.incr(`subscribers:${channel}`);
          return;
        }

        case "unsubscribe": {
          const channel = `${appId}:${data.channel}`;
          const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
          if (!isSubscribed) {
            return;
          }

          webSocketsChannels.get(webSocket)?.delete(channel);

          channelsWebSockets.set(
            channel,
            (channelsWebSockets.get(channel) || []).filter(
              ({ id }) => id !== webSocket.id
            )
          );

          const key = `subscribers:${channel}`;
          const subscribersLeft = await redis.decr(key);
          if (subscribersLeft === 0) {
            await redis.del(key);
          }

          return;
        }

        case "message": {
          const channel = `${appId}:${data.channel}`;
          const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
          if (!isSubscribed) {
            // can only send messages on channels you're subscribed to.
            return;
          }

          nc.publish(
            "message",
            sc.encode({
              channel,
              webSocketId: webSocket.id,
              data: data.data,
            })
          );
        }
      }
    });
  });
}
