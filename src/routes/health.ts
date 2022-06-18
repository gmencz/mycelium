import type { FastifyInstance } from "fastify";
import type { NatsConnection } from "nats";

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
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return reply.status(401).send({
        errors: [`Missing authorization header`],
      });
    }

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7, authHeader.length);
      if (token !== authSecret) {
        return reply.status(401).send({
          errors: [`Invalid authorization token`],
        });
      }
    } else {
      return reply.status(401).send({
        errors: [`Invalid authorization header`],
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
