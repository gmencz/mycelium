import { WebSocket } from "ws";
import waitForExpect from "wait-for-expect";
import { build, teardown } from "../../server";
import { getWebSocketURL } from "../../util/tests";
import { CloseCode } from "../../websocket/protocol";

let ctx: Awaited<ReturnType<typeof build>>;
beforeAll(async () => {
  ctx = await build();
  await ctx.server.listen();
});

afterAll(async () => {
  await teardown(ctx);
});

it("answers to pings", async () => {
  const url = await getWebSocketURL(ctx.server);
  const webSocket = new WebSocket(url);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.OPEN);
  });

  const testMessage = JSON.stringify({ type: "ping" });
  let responseMessage;

  webSocket.on("message", (data) => {
    responseMessage = JSON.parse(data.toString());
    webSocket.close();
  });

  webSocket.send(testMessage);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.CLOSED);
  });

  expect(responseMessage).toMatchInlineSnapshot(`
    Object {
      "type": "pong",
    }
  `);
});

it("subscribes to channels", async () => {
  const url = await getWebSocketURL(ctx.server);
  const webSocket = new WebSocket(url);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.OPEN);
  });

  const testMessage = JSON.stringify({
    type: "subscribe",
    channel: "test-channel",
  });

  let responseMessage;

  webSocket.on("message", (data) => {
    responseMessage = JSON.parse(data.toString());
    webSocket.close();
  });

  webSocket.send(testMessage);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.CLOSED);
  });

  expect(responseMessage).toMatchInlineSnapshot(`
    Object {
      "channel": "test-channel",
      "type": "subscriptionSuccess",
    }
  `);
});

it("unsubscribes from channels", async () => {
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
  let unsubscriptionResponse;

  webSocket.on("message", (message) => {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case "subscriptionSuccess": {
        isSubscribed = true;
        return;
      }

      case "unsubscriptionSuccess": {
        unsubscriptionResponse = data;
        webSocket.close();
        return;
      }
    }
  });

  webSocket.send(subscribeMessage);

  await waitForExpect(() => {
    expect(isSubscribed).toBe(true);
  });

  webSocket.send(unsubscribeMessage);

  await waitForExpect(() => {
    expect(webSocket.readyState).toBe(webSocket.CLOSED);
  });

  expect(unsubscriptionResponse).toMatchInlineSnapshot(`
    Object {
      "channel": "test-channel",
      "type": "unsubscriptionSuccess",
    }
  `);
});

it("broadcasts messages to channels subscribers except self", async () => {
  const url = await getWebSocketURL(ctx.server);
  const webSocket1 = new WebSocket(url);
  const webSocket2 = new WebSocket(url);

  await waitForExpect(() => {
    expect(webSocket1.readyState).toBe(webSocket1.OPEN);
    expect(webSocket2.readyState).toBe(webSocket1.OPEN);
  });

  const subscribeMessage = JSON.stringify({
    type: "subscribe",
    channel: "test-channel",
  });

  const messageMessage = JSON.stringify({
    type: "message",
    channel: "test-channel",
    data: "Hello, World!",
  });

  let isWebSocket1Subscribed = false;
  let receivedWebSocket1Message: unknown;
  webSocket1.on("message", (message) => {
    const data = JSON.parse(message.toString());
    switch (data.type) {
      case "subscriptionSuccess": {
        isWebSocket1Subscribed = true;
        return;
      }

      case "message": {
        receivedWebSocket1Message = data;
        return;
      }
    }
  });

  let isWebSocket2Subscribed = false;
  let receivedWebSocket2Message: unknown;
  webSocket2.on("message", (message) => {
    const data = JSON.parse(message.toString());
    switch (data.type) {
      case "subscriptionSuccess": {
        isWebSocket2Subscribed = true;
        return;
      }

      case "message": {
        receivedWebSocket2Message = data;
        return;
      }
    }
  });

  webSocket1.send(subscribeMessage);
  webSocket2.send(subscribeMessage);

  await waitForExpect(() => {
    expect(isWebSocket1Subscribed).toBe(true);
    expect(isWebSocket2Subscribed).toBe(true);
  });

  webSocket1.send(messageMessage);

  // webSocket2 should receive the message.
  await waitForExpect(() => {
    expect(receivedWebSocket2Message).not.toBe(undefined);
  });

  // webSocket1 should not receive it because messages aren't sent to the one that sent it.
  expect(receivedWebSocket1Message).toBe(undefined);

  expect(receivedWebSocket2Message).toMatchInlineSnapshot(`
    Object {
      "channel": "test-channel",
      "data": "Hello, World!",
      "type": "message",
    }
  `);

  webSocket1.close();
  webSocket2.close();
});

it("closes unauthenticated connections", async () => {
  // Get the URL without the key/token part. (what authenticates the connection).
  const url = (await getWebSocketURL(ctx.server)).split("?")[0];
  const webSocket = new WebSocket(url);
  let closeCode: CloseCode;

  webSocket.on("close", (code) => {
    closeCode = code;
  });

  await waitForExpect(() => {
    expect(closeCode).toBe(CloseCode.AuthenticationError);
  });
});
