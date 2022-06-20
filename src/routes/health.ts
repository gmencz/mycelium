import type { FastifyInstance } from "fastify";
import type { NatsConnection } from "nats";

import { parseAuthorizationHeader } from "../util/auth";
import { db } from "../util/db";
import { redis } from "../util/redis";

interface RouteContext {
  nc: NatsConnection;
  authSecret: string;
}

export async function routes(
  server: FastifyInstance,
  { nc, authSecret }: RouteContext
) {
  server.get("/", async (req, reply) => {
    try {
      const token = parseAuthorizationHeader(req.headers.authorization);
      if (token !== authSecret) {
        return reply.status(401).send({
          errors: [`Invalid authorization token`],
        });
      }
    } catch (error) {
      return reply.status(401).send({
        errors: [(error as Error).message],
      });
    }

    const errors: string[] = [];

    try {
      await db.$queryRaw`SELECT 1`;
    } catch (error) {
      errors.push("Database is not operational");
    }

    try {
      await redis.ping();
    } catch (error) {
      errors.push("Redis is not operational");
    }

    try {
      if (nc.isClosed()) {
        errors.push("NATS connection is closed");
      }
    } catch (error) {
      errors.push("NATS is not operational");
    }

    if (errors.length > 0) {
      return reply.status(500).send({
        errors,
      });
    }

    reply.send("OK");
  });
}
