import type { FastifyInstance } from "fastify";

import fetch from "cross-fetch";
import { db } from "../util/db";
import { redis } from "../util/redis";

const NATS_HEALTHCHECK_ENDPOINT = process.env.NATS_HEALTHCHECK_ENDPOINT;
if (!NATS_HEALTHCHECK_ENDPOINT) {
  throw new Error("NATS_HEALTHCHECK_ENDPOINT is missing");
}

export async function routes(server: FastifyInstance) {
  server.get("/", async (req, reply) => {
    const host = req.headers["X-Forwarded-Host"] ?? req.headers["host"];

    try {
      await Promise.all([
        // If we can make a simple query and make a HEAD request to ourselves, then we're good.
        fetch(`http://${host}/`, { method: "HEAD" }).then((r) => {
          if (!r.ok) return Promise.reject(r);
        }),

        // Database check
        db.$queryRaw`SELECT 1`,

        // Redis check
        redis.ping(),

        // NATS check
        fetch(NATS_HEALTHCHECK_ENDPOINT!, { method: "GET" }).then((r) => {
          if (!r.ok) return Promise.reject(r);
        }),
      ]);

      reply.send("OK");
    } catch (error) {
      console.log(error);

      server.log.error("healthcheck ❌");
      return reply.status(500).send("ERROR");
    }
  });
}
