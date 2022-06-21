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
  });

  expect(response.statusCode).toBe(200);
});

it("should not return 200 if something is wrong", async () => {
  // Close the NATS connection on purpose.
  await ctx.nc.close();

  // TODO: FIX THIS by starting server and passing the right "host" header.

  const response = await ctx.server.inject({
    method: "GET",
    url: "/health",
  });

  expect(response.statusCode).toBe(500);
});
