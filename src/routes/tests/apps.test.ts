import { sign } from "jsonwebtoken";
import waitForExpect from "wait-for-expect";
import WebSocket from "ws";
import { build, teardown } from "../../server";
import { db } from "../../util/db";
import { getWebSocketURL } from "../../util/tests";

let ctx: Awaited<ReturnType<typeof build>>;
beforeAll(async () => {
  ctx = await build();
  await ctx.server.listen();
});

afterAll(async () => {
  await teardown(ctx);
});

it("GET /apps/:appId/channels requires authentication", async () => {
  const app = await db.app.findFirst();
  const response = await ctx.server.inject({
    method: "GET",
    url: `/apps/${app?.id}/channels`,
  });

  expect(response.statusCode).toBe(401);
});

it("GET /apps/:appId/channels shows the channels that are currently occupied", async () => {
  const url = await getWebSocketURL(ctx.server);
  const webSocket = new WebSocket(url);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.OPEN);
  });

  const subscribeMessage = JSON.stringify({
    type: "subscribe",
    channel: "test-channel",
  });

  const unsubscribeMessage = JSON.stringify({
    type: "unsubscribe",
    channel: "test-channel",
  });

  let isSubscribed = false;
  webSocket.on("message", (message) => {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case "subscriptionSuccess": {
        isSubscribed = true;
        return;
      }

      case "unsubscriptionSuccess": {
        webSocket.close();
        return;
      }
    }
  });

  webSocket.send(subscribeMessage);

  await waitForExpect(() => {
    expect(isSubscribed).toBe(true);
  });

  const apiKey = await db.apiKey.findFirst();
  if (!apiKey) {
    throw new Error("No api key found");
  }

  const jwt = sign({}, apiKey.secret, {
    header: { alg: "HS256", kid: apiKey.id },
  });

  const response = await ctx.server.inject({
    method: "GET",
    url: `/apps/${apiKey.appId}/channels`,
    headers: {
      authorization: `Bearer ${jwt}`,
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchInlineSnapshot(`
    Object {
      "channels": Array [
        "test-channel",
      ],
    }
  `);

  webSocket.send(unsubscribeMessage);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.CLOSED);
  });

  const response2 = await ctx.server.inject({
    method: "GET",
    url: `/apps/${apiKey.appId}/channels`,
    headers: {
      authorization: `Bearer ${jwt}`,
    },
  });

  expect(response2.statusCode).toBe(200);
  expect(response2.json()).toMatchInlineSnapshot(`
    Object {
      "channels": Array [],
    }
  `);
});
