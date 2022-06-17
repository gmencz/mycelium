import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { JwtPayload } from "jsonwebtoken";
import type { Codec, NatsConnection } from "nats";
import type { MyceliumWebSocket } from "../types";

import { decode, verify } from "jsonwebtoken";
import { generate } from "shortid";
import { z } from "zod";
import { db } from "../util/db";
import { redis } from "../util/redis";
import { validateChannelCapability } from "../validate-channel-capability";

interface WebSocketRoute {
  Querystring: { key?: string; token?: string };
}

interface RouteContext {
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
  nc: NatsConnection;
  sc: Codec<unknown>;
}

export const capabilitiesSchema = z.object({}).catchall(z.string().array());

const jwtPayloadSchema = z.object({
  "x-mycelium-capabilities": capabilitiesSchema.optional(),
});

function makeChannelName(channel: string, appId: string) {
  return `${appId}:${channel}`;
}

const channelNameSchema = z
  .string()
  .min(1)
  .max(255)
  .trim()
  .regex(/^[a-zA-Z0-9_-]+$/);

export async function routes(
  server: FastifyInstance,
  { webSocketsChannels, channelsWebSockets, nc, sc }: RouteContext
) {
  server.get<WebSocketRoute>("/", { websocket: true }, async (conn, req) => {
    const webSocket = conn.socket as unknown as MyceliumWebSocket;
    const { key, token } = req.query;
    if (!key && !token) {
      return webSocket.close(4001, "Provide either a key or a token");
    }

    if (key && token) {
      return webSocket.close(
        4001,
        "Provide either a key or a token and NOT both"
      );
    }

    // Basic auth
    if (key) {
      const apiKey = await db.apiKey.findUnique({
        where: {
          id: key,
        },
        select: {
          id: true,
          appId: true,
          capabilities: true,
        },
      });

      if (!apiKey) {
        return webSocket.close(4001, "Invalid key");
      }

      webSocket.auth = {
        apiKeyId: apiKey.id,
        appId: apiKey.appId,
        capabilities: apiKey.capabilities as z.infer<typeof capabilitiesSchema>,
      };
    }
    // Token auth
    else if (token) {
      let jwt;
      try {
        jwt = decode(token, { complete: true });
      } catch (error) {
        return webSocket.close(4001, "Invalid token");
      }

      if (!jwt) {
        return webSocket.close(4001, "Invalid token");
      }

      const { kid: apiKeyId } = jwt.header;
      if (!apiKeyId) {
        return webSocket.close(4001, "Invalid token");
      }

      const apiKey = await db.apiKey.findUnique({
        where: {
          id: apiKeyId,
        },
        select: {
          id: true,
          appId: true,
          secret: true,
          capabilities: true,
        },
      });

      if (!apiKey) {
        return webSocket.close(4001, "Invalid token");
      }

      let jwtPayload;
      try {
        jwtPayload = jwtPayloadSchema.parse(
          await new Promise<JwtPayload>((res, rej) => {
            verify(token, apiKey.secret, (error, payload) => {
              if (error) {
                return rej(error);
              }

              if (!payload || typeof payload === "string") {
                return rej();
              }

              res(payload);
            });
          })
        );
      } catch (error) {
        return webSocket.close(4001, "Invalid token");
      }

      const { "x-mycelium-capabilities": rawJwtCapabilities } = jwtPayload;

      if (rawJwtCapabilities) {
        let jwtCapabilities: z.infer<typeof capabilitiesSchema>;
        try {
          jwtCapabilities = capabilitiesSchema.parse(rawJwtCapabilities);
        } catch (error) {
          return webSocket.close(4001, "Invalid token capabilities");
        }

        const jwtCapabilitiesKeys = Object.keys(jwtCapabilities);
        if (jwtCapabilitiesKeys.length > 250) {
          return webSocket.close(
            4001,
            "Invalid token capabilities, 250 max capabilities"
          );
        }

        webSocket.auth = {
          apiKeyId: apiKey.id,
          appId: apiKey.appId,
          capabilities: jwtCapabilities,
        };
      } else {
        webSocket.auth = {
          apiKeyId: apiKey.id,
          appId: apiKey.appId,
          capabilities: apiKey.capabilities as z.infer<
            typeof capabilitiesSchema
          >,
        };
      }
    }

    webSocket.id = generate();
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
          let channel: string;
          try {
            channel = channelNameSchema.parse(data.channel);
          } catch (error) {
            return webSocket.send(
              JSON.stringify({
                type: "subscriptionError",
                message: "Invalid channel name",
              })
            );
          }

          const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
          if (isSubscribed) {
            return;
          }

          if (
            !validateChannelCapability(
              "subscribe",
              channel,
              webSocket.auth.capabilities
            )
          ) {
            return webSocket.send(
              JSON.stringify({
                type: "subscriptionError",
                message:
                  "Your capabilities don't allow subscribing to this channel",
              })
            );
          }

          channel = makeChannelName(channel, webSocket.auth.appId);

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
          let channel;
          try {
            channel = makeChannelName(
              channelNameSchema.parse(data.channel),
              webSocket.auth.appId
            );
          } catch (error) {
            webSocket.send(
              JSON.stringify({
                type: "unsubscriptionError",
                message: "Invalid channel name",
              })
            );

            return;
          }

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
          let channelName: string;
          try {
            channelName = channelNameSchema.parse(data.channel);
          } catch (error) {
            webSocket.send(
              JSON.stringify({
                type: "messageError",
                message: "Invalid channel name",
              })
            );

            return;
          }

          const channel = makeChannelName(channelName, webSocket.auth.appId);
          const isSubscribed = webSocketsChannels.get(webSocket)?.has(channel);
          if (!isSubscribed) {
            // can only send messages on channels you're subscribed to.
            return;
          }

          if (
            !validateChannelCapability(
              "message",
              channelName,
              webSocket.auth.capabilities
            )
          ) {
            return webSocket.send(
              JSON.stringify({
                type: "messageError",
                message:
                  "Your capabilities don't allow sending messages to this channel",
              })
            );
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
