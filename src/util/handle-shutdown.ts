import type { FastifyInstance } from "fastify";
import { redis } from "./redis";
import type { MyceliumWebSocket } from "../types";

const FIFTEEN_SECONDS = 15_000;
let shuttingDown = false;

interface Params {
  server: FastifyInstance;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
}

export function handleShutdown({
  server,
  webSocketsChannels,
  channelsWebSockets,
}: Params) {
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
}
