import type { FastifyInstance } from "fastify";
import { redis } from "../util/redis";

interface GetAppChannels {
  Params: { appId: string };
  Querystring: { filterByPrefix?: string; cursor?: string };
}

export async function routes(server: FastifyInstance) {
  server.get<GetAppChannels>("/apps/:appId/channels", async (req, reply) => {
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
}
