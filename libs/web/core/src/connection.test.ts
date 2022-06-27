import waitForExpect from "wait-for-expect";
import { AuthenticationType, Connection, testConnect } from "./connection";

let conn: Connection;
beforeAll(async () => {
  conn = await testConnect(
    {
      authentication: {
        type: AuthenticationType.KEY,
        getKey() {
          return "6O9oI7QsbFa77KveRRO2J:ycbUDnCXAo5nKJfbh2-jPdxYG1LxNbYx";
        },
      },
    },
    "ws://[::1]:9001/realtime"
  );
});

afterAll(() => {
  conn.close();
});

test("pub/sub", async () => {
  const channel = "test-channel";
  await conn.subscribe(channel);
  expect(conn.getSubscriptions().includes(channel)).toBe(true);

  let handlerData: unknown;
  conn.addMessageHandler<{ hello: "world" }>(
    channel,
    "test-handler-1",
    (_, data) => {
      handlerData = data;
    }
  );

  await conn.publish(
    channel,
    {
      hello: "world",
    },
    true
  );

  await waitForExpect(() => {
    expect(handlerData).not.toBeUndefined();
  });

  expect(handlerData).toMatchInlineSnapshot(`
    Object {
      "hello": "world",
    }
  `);

  await conn.unsubscribe(channel);
  expect(conn.getSubscriptions().includes(channel)).toBe(false);
});

test("errors", async () => {
  try {
    expect(await conn.unsubscribe("not-subscribed-to-this"));
  } catch (error) {
    expect(error).toMatchInlineSnapshot(
      `[Error: you're not subscribed to the channel not-subscribed-to-this]`
    );
  }

  try {
    await conn.subscribe("channel-1");
    await conn.subscribe("channel-1");
  } catch (error) {
    expect(error).toMatchInlineSnapshot(
      `[Error: you're already subscribed to the channel channel-1]`
    );
  }

  try {
    await conn.publish("not-subscribed-to-this-either", "Hello, World!");
  } catch (error) {
    expect(error).toMatchInlineSnapshot(
      `[Error: you're not subscribed to the channel not-subscribed-to-this-either]`
    );
  }
});
