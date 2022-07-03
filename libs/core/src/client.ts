import ReconnectingWebSocket from 'reconnecting-websocket';
import waitForExpect from 'wait-for-expect';

import {
  ErrorMessage,
  HelloMessage,
  MessageTypes,
  PublishMessage,
  PublishSuccessMessage,
  SubscribeSuccessMessage,
} from './message';

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

interface Connection {
  authentication: KeyAuthentication | TokenAuthentication;
  baseURL?: string;
  manual?: boolean;
}

interface Ack {
  failureReason?: string;
}

type SpecialEvent = 'connect' | 'disconnect';

type Listener<TData> = (data: TData, event: string) => void;

interface Channel {
  name: string;
  on: <TData = unknown>(event: string, listener: Listener<TData>) => void;
  once: <TData = unknown>(event: string, listener: Listener<TData>) => void;
  off: <TData>(event: string, listener: Listener<TData>) => void;
  offOnce: <TData>(event: string, listener: Listener<TData>) => void;
  removeAllListeners: (...events: string[]) => void;
  onAny: <TData>(listener: Listener<TData>) => void;
  prependAny: <TData>(listener: Listener<TData>) => void;
  offAny: <TData>(...listeners: Listener<TData>[]) => void;
  publish: <TData = unknown>(
    event: string,
    data: TData,
    includePublisher: boolean
  ) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const defaults = {
  baseURL: 'wss://mycelium-server.fly.dev/realtime',
};

class Client {
  private channels = new Map<
    string,
    {
      instance: Channel;
      eventListeners: { event: string; listener: Listener<any> }[];
      anyListeners: Listener<any>[];
      onceListeners: { event: string; listener: Listener<any> }[];
    }
  >();

  private seqNumber = 1;
  private acks = new Map<number, Ack>();
  private specialEventsHandlers = new Map<SpecialEvent, VoidFunction[]>();
  private ws: ReconnectingWebSocket | undefined;

  public sid: string | undefined;
  public isConnected = false;

  constructor(connection: Connection) {
    if (!connection.manual) {
      this.connect(connection);
    }
  }

  public getChannels() {
    return Array.from(this.channels.keys());
  }

  public async channel(channelName: string): Promise<Channel> {
    if (!this.isConnected || !this.ws) {
      throw new Error(`failed to use channel ${channelName}, not connected`);
    }

    const existingChannel = this.channels.get(channelName);
    if (existingChannel) {
      return existingChannel.instance;
    }

    const subscribeSeq = this.seqNumber++;

    this.ws.send(
      JSON.stringify({
        t: MessageTypes.Subscribe,
        d: {
          s: subscribeSeq,
          c: channelName,
        },
      })
    );

    await waitForExpect(() => {
      if (!this.acks.has(subscribeSeq)) {
        throw new Error(
          `failed to subscribe to channel ${channelName}, timed out`
        );
      }
    });

    const ack = this.acks.get(subscribeSeq);
    if (ack?.failureReason) {
      throw new Error(ack.failureReason);
    }

    const channel: Channel = {
      name: channelName,

      unsubscribe: async () => {
        if (!this.isConnected || !this.ws) {
          throw new Error(
            `failed to unsubscribe from channel ${channelName}, not connected`
          );
        }

        if (!this.channels.has(channelName)) {
          throw new Error(
            `failed to unsubscribe from channel ${channelName}, not subscribed`
          );
        }

        const unsubscribeSeq = this.seqNumber++;

        this.ws.send(
          JSON.stringify({
            t: MessageTypes.Unsubscribe,
            d: {
              s: unsubscribeSeq,
              c: channelName,
            },
          })
        );

        await waitForExpect(() => {
          if (!this.acks.has(unsubscribeSeq)) {
            throw new Error(
              `failed to unsubscribe from channel ${channelName}, timed out`
            );
          }
        });

        const ack = this.acks.get(unsubscribeSeq);
        if (ack?.failureReason) {
          throw new Error(ack.failureReason);
        }

        this.channels.delete(channelName);
      },

      off: (event, listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            eventListeners: channel.eventListeners.filter(
              (l) => l.event !== event && l.listener !== listener
            ),
          });
        }
      },

      offOnce: (event, listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            onceListeners: channel.onceListeners.filter(
              (l) => l.event !== event && l.listener !== listener
            ),
          });
        }
      },

      offAny: (...listeners) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          if (!listeners.length) {
            // Remove all listeners
            this.channels.set(channelName, {
              ...channel,
              anyListeners: [],
            });

            return;
          }

          this.channels.set(channelName, {
            ...channel,
            anyListeners: channel.anyListeners.filter(
              (l) => !listeners.some((listener) => listener === l)
            ),
          });
        }
      },

      on: (event, listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            eventListeners: [
              ...channel.eventListeners,
              {
                event,
                listener: (data: any, event) => {
                  listener(data, event);
                },
              },
            ],
          });
        }
      },

      onAny: (listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            anyListeners: [...channel.anyListeners, listener],
          });
        }
      },

      once: (event, listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            onceListeners: [
              ...channel.onceListeners.filter((l) => l.event !== event),
              {
                event,
                listener: (data: any, event) => {
                  listener(data, event);
                },
              },
            ],
          });
        }
      },

      prependAny: (listener) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.channels.set(channelName, {
            ...channel,
            anyListeners: [listener, ...channel.anyListeners],
          });
        }
      },

      removeAllListeners: (...events) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          if (!events.length) {
            // Remove all listeners
            this.channels.set(channelName, {
              ...channel,
              eventListeners: [],
            });

            return;
          }

          this.channels.set(channelName, {
            ...channel,
            eventListeners: channel.eventListeners.filter(
              (l) => !events.some((ev) => ev === l.event)
            ),
          });
        }
      },

      publish: async (event, data, includePublisher = false) => {
        if (!this.isConnected || !this.ws) {
          throw new Error(
            `failed to publish message on channel ${channelName}, not connected`
          );
        }

        const publishSeq = this.seqNumber++;

        this.ws.send(
          JSON.stringify({
            t: MessageTypes.Publish,
            d: {
              e: event,
              s: publishSeq,
              c: channelName,
              d: data,
              ip: includePublisher,
            },
          })
        );

        await waitForExpect(() => {
          if (!this.acks.has(publishSeq)) {
            throw new Error(
              `failed to publish message on channel ${channelName}, timed out`
            );
          }
        });

        const ack = this.acks.get(publishSeq);
        if (ack?.failureReason) {
          throw new Error(ack.failureReason);
        }
      },
    };

    this.channels.set(channelName, {
      instance: channel,
      anyListeners: [],
      eventListeners: [],
      onceListeners: [],
    });

    return channel;
  }

  public on(specialEvent: SpecialEvent, handler: VoidFunction) {
    const existingHandlers = this.specialEventsHandlers.get(specialEvent) || [];
    this.specialEventsHandlers.set(specialEvent, [
      ...existingHandlers,
      handler,
    ]);
  }

  private runSpecialEventHandlers(specialEvent: SpecialEvent) {
    this.specialEventsHandlers.get(specialEvent)?.forEach((handler) => {
      handler();
    });
  }

  public disconnect() {
    if (!this.ws || !this.isConnected) {
      throw new Error(`can't disconnect, not connected`);
    }

    this.ws.close();

    // Reset state.
    this.acks = new Map();
    this.channels = new Map();
    this.seqNumber = 1;
    this.isConnected = false;
    this.sid = undefined;
    this.ws = undefined;
  }

  public async connect({
    authentication,
    baseURL = defaults.baseURL,
  }: Connection) {
    let url: string;
    if (authentication.type === AuthenticationType.KEY) {
      const key = await authentication.getKey();
      url = `${baseURL}?key=${key}`;
    } else {
      const token = await authentication.getToken();
      url = `${baseURL}?token=${token}`;
    }

    this.ws = new ReconnectingWebSocket(url);
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.ws) {
      return;
    }

    this.ws.addEventListener('error', () => {
      this.runSpecialEventHandlers('disconnect');
    });

    this.ws.addEventListener('close', () => {
      this.runSpecialEventHandlers('disconnect');
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const message = JSON.parse(ev.data.toString());
        switch (message.t) {
          case MessageTypes.Hello: {
            const { sid } = message.d as HelloMessage['d'];
            this.sid = sid;
            this.isConnected = true;
            this.runSpecialEventHandlers('connect');
            return;
          }

          case MessageTypes.Publish: {
            const {
              c: channelName,
              d: data,
              e: event,
            } = message.d as PublishMessage['d'];

            const channel = this.channels.get(channelName);
            if (channel) {
              channel.eventListeners.forEach((l) => {
                if (l.event === event) {
                  l.listener(data, event);
                }
              });

              channel.onceListeners
                .find((l) => l.event === event)
                ?.listener(data, event);

              channel.anyListeners.forEach((listener) => {
                listener(data, event);
              });
            }

            return;
          }

          case MessageTypes.UnsubscribeSuccess:
          case MessageTypes.PublishSuccess:
          case MessageTypes.SubscribeSucess: {
            const { s } = message.d as SubscribeSuccessMessage['d'];
            this.acks.set(s, {});
            return;
          }

          case MessageTypes.Error: {
            const { r: reason, s } = message as ErrorMessage;
            if (s) {
              this.acks.set(s, { failureReason: reason });
            }

            return;
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
}

export {
  Client,
  AuthenticationType,
  Connection,
  TokenAuthentication,
  KeyAuthentication,
  Channel,
};

export type { Listener };