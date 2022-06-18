import type { FastifyInstance } from "fastify";
import type { MyceliumWebSocket } from "../../types";

import { build, teardown } from "../../server";

describe("/health", () => {
  let ctx: Awaited<ReturnType<typeof build>>;
  beforeAll(async () => {
    ctx = await build();
  });

  afterAll(async () => {
    await teardown(ctx);
  });

  it("should return 200", async () => {
    const response = await ctx.server.inject({
      method: "GET",
      url: "/health",
      headers: {
        authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
    });

    console.log("status code: ", response.statusCode);
    console.log("body: ", response.body);

    expect(response.statusCode).toBe(200);
  });
});
