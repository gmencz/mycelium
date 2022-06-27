import waitForExpect from "wait-for-expect";
import { WebSocket } from "ws";

interface ConnectionOptions {
  authentication: KeyAuthentication | TokenAuthentication;
  timeoutMs?: number;
}

interface KeyAuthentication {
  type: AuthenticationType.KEY;

  /**
   * How to get the key used to authenticate the connection. For example by simply returning it or fetching it.
   * Don't use this authentication type in untrusted environments.
   * ```js
   * return "my-key-id:my-key-secret";
   * ```
   */
  getKey: () => string | Promise<string>;
}

interface TokenAuthentication {
  type: AuthenticationType.TOKEN;

  /**
   * How to get the token used to authenticate the connection. For example by fetching your API which
   * returns the token.
   * ```js
   * const { token } = await fetch(MY_API_URL).then(r => r.json());
   * return token;
   * ```
   */
  getToken: () => string | Promise<string>;
}

enum AuthenticationType {
  KEY,
  TOKEN,
}

enum MessageTypes {
  Hello = "hello",
  Error = "error",
  Subscribe = "subscribe",
  SubscribeSucess = "subscribe_success",
  Unsubscribe = "unsubscribe",
  UnsubscribeSuccess = "unsubscribe_success",
  Publish = "publish",
  PublishSuccess = "publish_success",
}

type Handler<TData = unknown> = (
  channel: string,
  data: TData
) => void | Promise<void>;

interface Connection {
  session: {
    id: string;
  };

  getSubscriptions: () => string[];

  subscribe: (channel: string) => Promise<void>;

  unsubscribe: (channel: string) => Promise<void>;

  publish: (
    channel: string,
    data: unknown,
    includePublisher?: boolean
  ) => Promise<void>;

  close: () => void;

  addMessageHandler: <TData = unknown>(
    channel: string,
    handlerName: string,
    handler: Handler<TData>
  ) => void;

  removeMessageHandler: (channel: string, handlerName: string) => void;
}

interface HelloMessage {
  t: MessageTypes.Hello;
  d: {
    sid: string;
  };
}

interface SubscribeSuccessMessage {
  t: MessageTypes.SubscribeSucess;
  d: {
    s: number;
    c: string;
  };
}

interface PublishSuccessMessage {
  t: MessageTypes.PublishSuccess;
  d: {
    s: number;
    c: string;
  };
}

interface PublishMessage {
  t: MessageTypes.Publish;
  d: {
    c: string;
    d: unknown;
  };
}

interface ErrorMessage {
  s?: number;
  t: MessageTypes;
  r: string;
}

const getURL = async (
  authentication: ConnectionOptions["authentication"],
  base: string
) => {
  let url: string;
  if (authentication.type === AuthenticationType.KEY) {
    const key = await authentication.getKey();
    url = `${base}?key=${key}`;
  } else {
    const token = await authentication.getToken();
    url = `${base}?token=${token}`;
  }

  return url;
};

const createWebSocket = async (opts: ConnectionOptions, base: string) => {
  let WebSocketInstance: typeof WebSocket;
  if (typeof WebSocket !== "undefined") {
    WebSocketInstance = WebSocket;
  } else {
    WebSocketInstance = WebSocket;
  }

  const url = await getURL(opts.authentication, base);
  const ws = new WebSocketInstance(url);
  return ws;
};

const baseConnect = async (
  opts: ConnectionOptions,
  ws: WebSocket
): Promise<Connection> => {
  let session: Connection["session"] | null = null;
  let seqNumber = 1;
  const channels: Set<string> = new Set();
  const handlers = new Map<string, { handler: Handler; name: string }[]>();
  const acks = new Map<
    number,
    {
      error: string | null;
    }
  >();

  ws.addEventListener("message", async (message) => {
    try {
      const parsed = JSON.parse(message.data.toString());
      switch (parsed.t) {
        case MessageTypes.Hello: {
          const { sid } = parsed.d as HelloMessage["d"];
          session = {
            id: sid,
          };

          return;
        }

        case MessageTypes.Publish: {
          const { c: channel, d: data } = parsed.d as PublishMessage["d"];
          const channelHandlers = handlers.get(channel);
          if (!channelHandlers || channelHandlers.length === 0) {
            console.warn(
              `received a published message on channel ${channel} but no handlers were found for it`
            );

            return;
          }

          for await (const h of channelHandlers) {
            await h.handler(channel, data);
          }

          return;
        }

        case MessageTypes.PublishSuccess: {
          const { s } = parsed.d as PublishSuccessMessage["d"];
          acks.set(s, { error: null });
          return;
        }

        case MessageTypes.SubscribeSucess: {
          const { c, s } = parsed.d as SubscribeSuccessMessage["d"];
          channels.add(c);
          acks.set(s, { error: null });
          return;
        }

        case MessageTypes.UnsubscribeSuccess: {
          const { c, s } = parsed.d as SubscribeSuccessMessage["d"];
          channels.delete(c);
          acks.set(s, { error: null });
          return;
        }

        case MessageTypes.Error: {
          const { r: reason, s } = parsed as ErrorMessage;
          if (s) {
            acks.set(s, { error: reason });
          }

          return;
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

  await waitForExpect(() => {
    if (!session) {
      throw new Error("failed to connect");
    }
  });

  return {
    // We can assert that session is not null here because waitForExpect ensures it isn't.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    session: session!,

    addMessageHandler: (channel, handlerName, handler) => {
      const existingHandlers = handlers.get(channel);
      if (existingHandlers) {
        handlers.set(channel, [
          ...existingHandlers,
          { handler: handler as Handler, name: handlerName },
        ]);
      } else {
        handlers.set(channel, [
          { handler: handler as Handler, name: handlerName },
        ]);
      }
    },

    removeMessageHandler: (channel, handlerName) => {
      const existingHandlers = handlers.get(channel);
      if (existingHandlers) {
        handlers.set(
          channel,
          existingHandlers.filter((handler) => handler.name !== handlerName)
        );
      }
    },

    getSubscriptions: () => Array.from(channels),

    subscribe: async (channel) => {
      if (ws.readyState !== ws.OPEN) {
        throw new Error(
          `failed to subscribe to channel ${channel}, the connection is not open`
        );
      }

      const subscribeSeq = seqNumber++;

      ws.send(
        JSON.stringify({
          t: MessageTypes.Subscribe,
          d: {
            s: subscribeSeq,
            c: channel,
          },
        })
      );

      await waitForExpect(() => {
        if (!channels.has(channel) || !acks.has(subscribeSeq)) {
          throw new Error(
            `failed to subscribe to channel ${channel}, timed out`
          );
        }
      });

      const ack = acks.get(subscribeSeq);
      if (ack?.error) {
        throw new Error(ack.error);
      }
    },

    unsubscribe: async (channel) => {
      if (ws.readyState !== ws.OPEN) {
        throw new Error(
          `failed to unsubscribe from channel ${channel}, the connection is not open`
        );
      }

      const unsubscribeSeq = seqNumber++;

      ws.send(
        JSON.stringify({
          t: MessageTypes.Unsubscribe,
          d: {
            s: unsubscribeSeq,
            c: channel,
          },
        })
      );

      await waitForExpect(() => {
        if (channels.has(channel) || !acks.has(unsubscribeSeq)) {
          throw new Error(
            `failed to unsubscribe from channel ${channel}, timed out`
          );
        }
      });

      const ack = acks.get(unsubscribeSeq);
      if (ack?.error) {
        throw new Error(ack.error);
      }
    },

    publish: async (channel, data, includePublisher = false) => {
      if (ws.readyState !== ws.OPEN) {
        throw new Error(
          `failed to publish message on channel ${channel}, the connection is not open`
        );
      }

      const publishSeq = seqNumber++;

      ws.send(
        JSON.stringify({
          t: MessageTypes.Publish,
          d: {
            s: publishSeq,
            c: channel,
            d: data,
            ip: includePublisher,
          },
        })
      );

      await waitForExpect(() => {
        if (!acks.has(publishSeq)) {
          throw new Error(
            `failed to publish message on channel ${channel}, timed out`
          );
        }
      });

      const ack = acks.get(publishSeq);
      if (ack?.error) {
        throw new Error(ack.error);
      }
    },

    close: () => {
      ws.close();
    },
  };
};

const connect = async (opts: ConnectionOptions) => {
  return baseConnect(
    opts,
    await createWebSocket(opts, "wss://mycelium-server.fly.dev/realtime")
  );
};

const testConnect = async (opts: ConnectionOptions, url: string) => {
  return baseConnect(opts, await createWebSocket(opts, url));
};

export {
  connect,
  testConnect,
  AuthenticationType,
  ConnectionOptions,
  KeyAuthentication,
  TokenAuthentication,
  Connection,
};
