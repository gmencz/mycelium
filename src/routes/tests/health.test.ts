import type { FastifyInstance } from "fastify";
import type { MyceliumWebSocket } from "../../types";

import { build, teardown } from "../../server";

let ctx: Awaited<ReturnType<typeof build>>;
beforeAll(async () => {
  ctx = await build();
});

afterAll(async () => {
  await teardown(ctx);
});

it("should return 200 if everything is okay", async () => {
  const response = await ctx.server.inject({
    method: "GET",
    url: "/health",
    headers: {
      authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
  });

  expect(response.statusCode).toBe(200);
});

it("should return 401 to unauthenticated requests", async () => {
  const response1 = await ctx.server.inject({
    method: "GET",
    url: "/health",
  });

  expect(response1.statusCode).toBe(401);

  const response2 = await ctx.server.inject({
    method: "GET",
    url: "/health",
    headers: {
      authorization: "Bearer invalid-token",
    },
  });

  expect(response2.statusCode).toBe(401);
});

it("should show what's causing the server to be unhealthy", async () => {
  // Close the NATS connection on purpose.
  await ctx.nc.close();

  const response = await ctx.server.inject({
    method: "GET",
    url: "/health",
    headers: {
      authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
  });

  expect(response.json()).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          "NATS connection is closed",
        ],
      }
    `);

  expect(response.statusCode).toBe(500);
});
