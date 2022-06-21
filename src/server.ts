import type { MyceliumWebSocket } from "./types";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import type { NatsConnection } from "nats";

import fastify from "fastify";
import ws from "@fastify/websocket";
import { setupEnv } from "./util/env";
import { connect, JSONCodec } from "nats";
import { redis } from "./util/redis";
import { db } from "./util/db";
import { routes as webSocketRoutes } from "./routes/websocket";
import { routes as appsRoutes } from "./routes/apps";
import { routes as healthRoutes } from "./routes/health";
import { subscribeToMessages } from "./util/nats";

const { NATS_HOST } = setupEnv();

const TEN_MB = 1_048_576;
export async function build(opts?: FastifyServerOptions) {
  // Store the server's clients and their channels
  const webSocketsChannels = new Map<MyceliumWebSocket, Set<string>>();
  const channelsWebSockets = new Map<string, MyceliumWebSocket[]>();
  const server = fastify(opts);
  const nc = await connect({ servers: NATS_HOST });
  server.log.info(`Connected to NATS at ${nc.getServer()}`);
  const sc = JSONCodec();
  subscribeToMessages({ channelsWebSockets, nc, sc });

  server.register(ws, {
    options: { clientTracking: false, maxPayload: TEN_MB },
  });

  server.get("/", (_, reply) => {
    reply.send("Hello from Mycelium");
  });

  server.register(webSocketRoutes, {
    channelsWebSockets,
    nc,
    sc,
    webSocketsChannels,
    prefix: "/ws",
  });

  server.register(appsRoutes, { prefix: "/apps" });

  server.register(healthRoutes, {
    prefix: "/health",
  });

  return { server, nc, channelsWebSockets, webSocketsChannels };
}

interface TeardownParams {
  server: FastifyInstance;
  nc: NatsConnection;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
}

export async function teardown({
  server,
  nc,
  webSocketsChannels,
  channelsWebSockets,
}: TeardownParams) {
  // Try to close all open websocket connections telling them to reconnect
  // because this server is shutting down.
  [...webSocketsChannels.keys()].forEach((webSocket) => {
    try {
      webSocket.close(4008, "Reconnect");
    } catch {}
  });

  // Update state of channels subscribers in Redis.
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

  // Close the server and its dependencies.
  await server.close();
  await nc.close();
  await redis.quit();
  await db.$disconnect();
}
