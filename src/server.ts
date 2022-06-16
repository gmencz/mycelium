import type { WebSocket } from "ws";
import type { MyceliumWebSocket } from "./types";

import fastify from "fastify";
import ws, { SocketStream } from "@fastify/websocket";
import { setupEnv } from "./util/env";
import { connect, JSONCodec } from "nats";
import { redis } from "./util/redis";
import { generate } from "shortid";
import { decode, JwtPayload, verify } from "jsonwebtoken";
import { db } from "./util/db";
import { routes as webSocketRoutes } from "./routes/websocket";
import { routes as appsRoutes } from "./routes/apps";
import { subscribeToMessages } from "./util/nats";
import { handleShutdown } from "./util/handle-shutdown";

const { NATS_HOST, PORT } = setupEnv();

// Store the server's clients and their channels
const webSocketsChannels = new Map<MyceliumWebSocket, Set<string>>();
const channelsWebSockets = new Map<string, MyceliumWebSocket[]>();
const server = fastify({ logger: true });

const TEN_MB = 1_048_576;
server.register(ws, {
  options: { clientTracking: false, maxPayload: TEN_MB },
});

const start = async () => {
  try {
    const nc = await connect({ servers: NATS_HOST });
    server.log.info(`Connected to NATS at ${nc.getServer()}`);
    const sc = JSONCodec();
    subscribeToMessages({ channelsWebSockets, nc, sc });

    server.register(webSocketRoutes, {
      channelsWebSockets,
      nc,
      sc,
      webSocketsChannels,
    });

    server.register(appsRoutes);

    await server.listen({ port: Number(PORT) });
  } catch (err) {
    server.log.error(
      `mycelium failed to listen to port ${PORT}, error: ${err}`
    );
    process.exit(1);
  }
};

start();
handleShutdown({ channelsWebSockets, webSocketsChannels, server });
