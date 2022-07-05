import ReconnectingWebSocket from 'reconnecting-websocket';
import waitForExpect from 'wait-for-expect';
import { InstanceWithEvents } from './instance-with-events';

import {
  AckDetails,
  AuthenticationType,
  Channel,
  Connection,
  ErrorMessage,
  HelloMessage,
  MessageTypes,
  PublishMessage,
  SituationChangeMessage,
  SituationChangesListener,
  SpecialEvent,
  SubscribeSuccessMessage,
} from './types';

/**
 * Default connection options.
 */
const defaults = {
  baseURL: 'wss://mycelium-server.fly.dev/realtime',
};

/**
 * Mycelium client.
 */
class Client {
  /**
   * The channels the client is subscribed to.
   */
  private channels = new Map<string, Channel>();

  /**
   * The situation changes prefixes the client is interested in.
   */
  private situationChangesPrefixes = new Map<
    string,
    SituationChangesListener
  >();

  /**
   * The last sequence number sent to Mycelium to be acknowledged.
   */
  private seqNumber = 1;

  /**
   * The acknowledged sequence numbers along with details about the acknowledgement.
   * For example if the message failed, the details would include the reason it failed.
   */
  private acks = new Map<number, AckDetails>();

  /**
   * The handlers for events of `SpecialEvent`.
   */
  private specialEventsHandlers = new Map<SpecialEvent, VoidFunction[]>();

  /**
   * The WebSocket.
   */
  private ws: ReconnectingWebSocket | undefined;

  /**
   * The id of the client's session.
   */
  public sid: string | undefined;

  /**
   * Whether the client is connected (WebSocket connected and session started).
   */
  public isConnected = false;

  /**
   * Creates a new client and connects to Mycelium unless with the options passed in `connection`.
   * If `connection.manual` is set to true, you will have to manually connect with `Client.connect()`.
   * @param connection The connection options.
   */
  constructor(connection: Connection) {
    if (!connection.manual) {
      this.connect(connection);
    }
  }

  /**
   * Gets the channels the client is subscribed to.
   */
  public getChannels() {
    return Array.from(this.channels.keys());
  }

  /**
   * Sends a WebSocket message in JSON format.
   * @param data The data to send in JSON format.
   */
  private sendJSON(data: unknown) {
    this.ws?.send(JSON.stringify(data));
  }

  /**
   * Listens to situation changes on a prefix, for example if we want to get notified when any channel that starts
   * with the name `user-` becomes vacant or occupied, we can listen to situation changes on the prefix `user-`.
   * If the client is already listening on the specified prefix, the listener will be returned.
   * @param channelPrefix The prefix to listen to situation changes on.
   */
  public async getOrListenToSituationChanges(
    channelPrefix: string
  ): Promise<SituationChangesListener> {
    if (!this.isConnected || !this.ws) {
      throw new Error(
        `failed to listen to situation changes on prefix ${channelPrefix}, not connected`
      );
    }

    const existingListener = this.situationChangesPrefixes.get(channelPrefix);
    if (existingListener) {
      return existingListener;
    }

    const listenSeq = this.seqNumber++;

    this.sendJSON({
      t: MessageTypes.SituationListen,
      d: {
        s: listenSeq,
        cp: channelPrefix,
      },
    });

    // Wait for the listen to be acknowledged.
    await waitForExpect(() => {
      if (!this.acks.has(listenSeq)) {
        throw new Error(
          `failed to listen to situation changes on prefix ${channelPrefix}, timed out`
        );
      }
    });

    const ack = this.acks.get(listenSeq);
    if (ack?.failureReason) {
      throw new Error(ack.failureReason);
    }

    const situationChangesListener: SituationChangesListener =
      new InstanceWithEvents({
        prefix: channelPrefix,
      });

    this.situationChangesPrefixes.set(channelPrefix, situationChangesListener);
    return situationChangesListener;
  }

  /**
   * Stops listening to situation changes on the specified prefix.
   * @param channelPrefix The prefix to stop listening to situation changes on.
   */
  public async unlistenToSituationChanges(channelPrefix: string) {
    if (!this.isConnected || !this.ws) {
      throw new Error(
        `failed to unlisten to situation changes on prefix ${channelPrefix}, not connected`
      );
    }

    if (!this.situationChangesPrefixes.has(channelPrefix)) {
      throw new Error(
        `failed to unlisten to situation changes on prefix ${channelPrefix}, not listening`
      );
    }

    const unlistenSeq = this.seqNumber++;

    this.sendJSON({
      t: MessageTypes.SituationUnlisten,
      d: {
        s: unlistenSeq,
        cp: channelPrefix,
      },
    });

    // Wait for the unlisten to be acknowledged.
    await waitForExpect(() => {
      if (!this.acks.has(unlistenSeq)) {
        throw new Error(
          `failed to unlisten to situation changes on prefix ${channelPrefix}, timed out`
        );
      }
    });

    const ack = this.acks.get(unlistenSeq);
    if (ack?.failureReason) {
      throw new Error(ack.failureReason);
    }

    this.situationChangesPrefixes.delete(channelPrefix);
  }

  /**
   * Subscribes to the specified channel, if the client is already subscribed, the channel will be returned.
   * @param channelName The name of the channel to subscribe to.
   */
  public async getOrSubscribeToChannel(channelName: string): Promise<Channel> {
    if (!this.isConnected || !this.ws) {
      throw new Error(
        `failed to get or subscribe to channel ${channelName}, not connected`
      );
    }

    const existingChannel = this.channels.get(channelName);
    if (existingChannel) {
      return existingChannel;
    }

    const subscribeSeq = this.seqNumber++;

    this.sendJSON({
      t: MessageTypes.Subscribe,
      d: {
        s: subscribeSeq,
        c: channelName,
      },
    });

    // Wait for the subscription to be acknowdleged.
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

    const channel: Channel = new InstanceWithEvents({
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

        this.sendJSON({
          t: MessageTypes.Unsubscribe,
          d: {
            s: unsubscribeSeq,
            c: channelName,
          },
        });

        // Wait for the unsubscription to be acknowdleged.
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

      publish: async (event, data, includePublisher = false) => {
        if (!this.isConnected || !this.ws) {
          throw new Error(
            `failed to publish message on channel ${channelName}, not connected`
          );
        }

        const publishSeq = this.seqNumber++;

        this.sendJSON({
          t: MessageTypes.Publish,
          d: {
            e: event,
            s: publishSeq,
            c: channelName,
            d: data,
            ip: includePublisher,
          },
        });

        // Wait for the publish to be acknowledged.
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
    });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Adds a handler to the specified special event.
   * @param specialEvent The special event to handle.
   * @param handler The handler.
   */
  public on(specialEvent: SpecialEvent, handler: VoidFunction) {
    const existingHandlers = this.specialEventsHandlers.get(specialEvent) || [];
    this.specialEventsHandlers.set(specialEvent, [
      ...existingHandlers,
      handler,
    ]);
  }

  /**
   * Runs the special events handlers.
   * @param specialEvent The special event to run the handlers on.
   */
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
    this.situationChangesPrefixes = new Map();
    this.seqNumber = 1;
    this.isConnected = false;
    this.sid = undefined;
    this.ws = undefined;
  }

  /**
   * Creates a WebSocket connection to Mycelium. This happens by default when instantiating a new Client
   * unless manual mode is set.
   * @param connection The options for the connection.
   */
  public async connect(
    connection: Pick<Connection, 'authentication' | 'baseURL'>
  ) {
    const { authentication, baseURL } = connection;

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

  /**
   * Sets up the WebSocket event listeners.
   */
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

            this.channels.get(channelName)?.handleEvent(event, data);
            return;
          }

          case MessageTypes.SituationChange: {
            const { c: channelName, s: situation } =
              message.d as SituationChangeMessage['d'];

            for (const prefix of this.situationChangesPrefixes.keys()) {
              if (channelName.startsWith(prefix)) {
                this.situationChangesPrefixes
                  .get(prefix)!
                  .handleEvent(situation, channelName);
              }
            }
          }

          case MessageTypes.SituationUnlistenSuccess:
          case MessageTypes.SituationListenSuccess:
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

export { Client, defaults };
