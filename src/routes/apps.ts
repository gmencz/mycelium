import type { FastifyInstance } from "fastify";

import { decode } from "jsonwebtoken";
import { parseAuthorizationHeader } from "../util/auth";
import { db } from "../util/db";
import { redis } from "../util/redis";

interface GetAppChannels {
  Params: { appId: string };
  Querystring: { filterByPrefix?: string; cursor?: string };
}

export async function routes(server: FastifyInstance) {
  server.get<GetAppChannels>("/:appId/channels", async (req, reply) => {
    const { appId } = req.params;
    let token;
    try {
      token = parseAuthorizationHeader(req.headers.authorization);
    } catch (error) {
      return reply.status(401).send({
        errors: [(error as Error).message],
      });
    }

    let jwt;
    try {
      jwt = decode(token, { complete: true });
    } catch (error) {
      return reply.status(401).send({
        errors: ["Invalid authorization token"],
      });
    }

    if (!jwt) {
      return reply.status(401).send({
        errors: ["Invalid authorization token"],
      });
    }

    const { kid: apiKeyId } = jwt.header;
    if (!apiKeyId) {
      return reply.status(401).send({
        errors: ["Invalid authorization token"],
      });
    }

    const apiKey = await db.apiKey.findFirst({
      where: {
        AND: [{ id: { equals: apiKeyId } }, { appId: { equals: appId } }],
      },
      select: {
        id: true,
        secret: true,
        capabilities: true,
        app: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!apiKey) {
      return reply.status(401).send({
        errors: ["Invalid authorization token"],
      });
    }

    const filterByPrefix = req.query.filterByPrefix;
    const cursor = Number(req.query.cursor || 0);
    let match: string;
    if (filterByPrefix) {
      match = `subscribers:${apiKey.app.id}:${filterByPrefix}*`;
    } else {
      match = `subscribers:${apiKey.app.id}:*`;
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
}
