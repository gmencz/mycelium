import type { FastifyInstance } from "fastify";
import type { MyceliumWebSocket } from "../types";

import { db } from "./db";
import { redis } from "./redis";

interface BeforeShutdownParams {
  timeoutMs?: number;
  log: {
    info: (data: unknown) => void;
    error: (data: unknown) => void;
  };
}

type BeforeShutdownCallback = (code: number) => unknown;

const FIFTEEN_SECONDS = 15_000;
let shuttingDown = false;

export function beforeShutdown(
  { log, timeoutMs }: BeforeShutdownParams,
  callback: BeforeShutdownCallback
) {
  async function exitProcess(code: number) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    let timeoutId: NodeJS.Timeout | undefined;
    try {
      log.info(`Attempting a graceful shutdown with code ${code}`);

      timeoutId = setTimeout(() => {
        log.info(`Forcing a shutdown with code ${code}`);
        process.exit(code);
      }, timeoutMs || FIFTEEN_SECONDS);

      await callback(code);

      clearTimeout(timeoutId);
      log.info("Goodbye!");
    } catch (error) {
      log.error("Error shutting down gracefully");
      log.error(error);
      log.info(`Forcing exit with code ${code}`);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      process.exit(code);
    }
  }

  process.on("unhandledRejection", (reason: Error | any) => {
    log.error(`Unhandled rejection: ${reason.message || reason}`);
    throw new Error(reason.message || reason);
  });

  process.on("uncaughtException", (error: Error) => {
    log.error(`Uncaught exception: ${error.message}`);
    exitProcess(1);
  });

  ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"].forEach((signal) =>
    process.on(signal, () => {
      log.info(`Process ${process.pid} received ${signal}`);
      exitProcess(0);
    })
  );
}
