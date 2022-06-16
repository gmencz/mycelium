import type { WebSocket } from "ws";

import fastify from "fastify";
import ws, { SocketStream } from "@fastify/websocket";
import { setupEnv } from "./setup-env";
import { connect, JSONCodec } from "nats";
import { redis } from "./redis";
import { generate } from "shortid";
import { decode, JwtPayload, verify } from "jsonwebtoken";
import { onShutdown } from "node-graceful-shutdown";
import { db } from "./db";

const { NATS_HOST, PORT } = setupEnv();

interface MyceliumWebSocket extends WebSocket {
  id: string;
  appId: string;
}

function isPrivateChannel(channel: string) {
  return channel.startsWith("private");
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

// Store the server's clients and their channels
const webSocketsChannels = new Map<MyceliumWebSocket, Set<string>>();
const channelsWebSockets = new Map<string, MyceliumWebSocket[]>();
const server = fastify({ logger: true });

async function webSocketCleanup(webSocket: MyceliumWebSocket) {
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
}

const TEN_MB = 1_048_576;
server.register(ws, {
  options: { clientTracking: false, maxPayload: TEN_MB },
});

const start = async () => {
  try {
    // Connect to NATS
    const nc = await connect({ servers: NATS_HOST });
    server.log.info(`Connected to NATS at ${nc.getServer()}`);

    // Create a JSON codec
    const sc = JSONCodec();

    // Create a simple subscriber and iterate over messages
    // matching the subscription
    const sub = nc.subscribe("message");
    (async () => {
      for await (const m of sub) {
        const data: any = sc.decode(m.data);
        const webSockets = channelsWebSockets.get(data.channel);
        if (webSockets) {
          const message = JSON.stringify({
            type: "message",
            channel: data.channel.split(":")[1],
            data: data.data,
          });

          if (data.webSocketId) {
            webSockets.forEach((webSocket) => {
              if (webSocket.id !== data.webSocketId) {
                webSocket.send(message);
              }
            });
          } else {
            webSockets.forEach((webSocket) => {
              webSocket.send(message);
            });
          }
        }
      }
    })();

    server.register(async function (server) {
      server.get<{
        Querystring: { appId?: string };
      }>("/", { websocket: true }, async (conn, req) => {
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
          await webSocketCleanup(webSocket);
        });

        webSocket.on("message", async (message) => {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case "subscribe": {
              // Do NOT allow ":" on channel names.
              const channel = `${appId}:${data.channel}`;
              const isSubscribed = webSocketsChannels
                .get(webSocket)
                ?.has(channel);
              if (isSubscribed) {
                return;
              }

              if (isPrivateChannel(channel)) {
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
              const isSubscribed = webSocketsChannels
                .get(webSocket)
                ?.has(channel);
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
              const isSubscribed = webSocketsChannels
                .get(webSocket)
                ?.has(channel);
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
    });

    server.get<{
      Params: { appId: string };
      Querystring: { filterByPrefix?: string; cursor?: string };
    }>("/apps/:appId/channels", async (req, reply) => {
      const { appId } = req.params;
      const isValidAppId = await redis.sismember("apps", appId);
      if (!isValidAppId) {
        reply.status(404).send({
          message: `App ${appId} not found`,
        });

        return;
      }

      const filterByPrefix = req.query.filterByPrefix;
      const cursor = Number(req.query.cursor || 0);
      let match: string;
      if (filterByPrefix) {
        match = `subscribers:${appId}:${filterByPrefix}*`;
      } else {
        match = `subscribers:${appId}:*`;
      }

      const [updatedCursor, maybeDuplicateChannels] = await redis.scan(
        `${cursor}`,
        "MATCH",
        match,
        "COUNT",
        100
      );

      // There may be duplicate channels due to redis scan so we have to deduplicate.
      const channels = new Set(maybeDuplicateChannels);

      reply.send({
        channels: [...channels].map((channel) => {
          const [, name] = channel.split(`subscribers:${appId}:`);
          return name;
        }),
        cursor: Number(updatedCursor) === 0 ? undefined : updatedCursor,
      });
    });

    await server.listen({ port: Number(PORT) });
  } catch (err) {
    server.log.error(
      `mycelium failed to listen to port ${PORT}, error: ${err}`
    );
    process.exit(1);
  }
};

start();

const FIFTEEN_SECONDS = 15_000;
let shuttingDown = false;
async function shutdown(code: number, timeout = FIFTEEN_SECONDS) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  let timeoutId: NodeJS.Timeout | undefined;
  try {
    server.log.info(`Attempting a graceful shutdown with code ${code}`);

    timeoutId = setTimeout(() => {
      server.log.info(`Forcing a shutdown with code ${code}`);
      process.exit(code);
    }, timeout);

    [...webSocketsChannels.keys()].forEach((webSocket) => {
      try {
        webSocket.close(4008, "Reconnect");
      } catch {}
    });

    const channels = channelsWebSockets.keys();
    for await (const channel of channels) {
      const key = `subscribers:${channel}`;
      const subscribersLeft = await redis.decrby(
        key,
        channelsWebSockets.get(channel)?.length || 0
      );

      if (subscribersLeft === 0) {
        await redis.del(key);
      }
    }

    clearTimeout(timeoutId);
    server.log.info("Goodbye!");
    process.exit(code);
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    server.log.error("Error shutting down gracefully");
    server.log.error(error);
    server.log.info(`Forcing exit with code ${code}`);
    process.exit(code);
  }
}

process.on("unhandledRejection", (reason: Error | any) => {
  console.log(reason);

  server.log.error(`Unhandled rejection: ${reason.message || reason}`);
  throw new Error(reason.message || reason);
});

process.on("uncaughtException", (error: Error) => {
  server.log.error(`Uncaught exception: ${error.message}`);
  shutdown(1);
});

["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"].forEach((signal) =>
  process.on(signal, () => {
    server.log.error(`Process ${process.pid} received ${signal}`);
    shutdown(0);
  })
);
