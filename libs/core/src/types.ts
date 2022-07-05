import { InstanceWithEvents } from './instance-with-events';

enum MessageTypes {
  Hello = 'hello',
  Error = 'error',
  Subscribe = 'subscribe',
  SubscribeSucess = 'subscribe_success',
  Unsubscribe = 'unsubscribe',
  UnsubscribeSuccess = 'unsubscribe_success',
  Publish = 'publish',
  PublishSuccess = 'publish_success',
  SituationListen = 'situation_listen',
  SituationListenSuccess = 'situation_listen_success',
  SituationUnlisten = 'situation_unlisten',
  SituationUnlistenSuccess = 'situation_unlisten_success',
  SituationChange = 'situation_change',
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
    e: string;
    c: string;
    d: unknown;
  };
}

enum Situation {
  Vacant = 'vacant',
  Occupied = 'occupied',
}

interface SituationChangeMessage {
  t: MessageTypes.SituationChange;
  d: {
    s: Situation;
    c: string;
  };
}

interface ErrorMessage {
  s?: number;
  t: MessageTypes;
  r: string;
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

interface Connection {
  authentication: KeyAuthentication | TokenAuthentication;
  baseURL?: string;
  manual?: boolean;
}

interface AckDetails {
  failureReason?: string;
}

type SpecialEvent = 'connect' | 'disconnect';

interface ChannelInstance {
  name: string;

  /**
   * Publish an event on the channel.
   * @param event The name of the event.
   * @param data The data to be sent along with the event.
   * @param includePublisher Whether the event should also be published to self.
   */
  publish: <TData = unknown>(
    event: string,
    data: TData,
    includePublisher: boolean
  ) => Promise<void>;

  /**
   * Unsubscribe from the channel.
   */
  unsubscribe: () => Promise<void>;
}

type Channel = InstanceWithEvents<ChannelInstance, string>;

interface SituationChangesListenerInstance {
  prefix: string;
}

type SituationChangesListener = InstanceWithEvents<
  SituationChangesListenerInstance,
  Situation
>;

export {
  AckDetails,
  AuthenticationType,
  Channel,
  ChannelInstance,
  Connection,
  ErrorMessage,
  HelloMessage,
  KeyAuthentication,
  MessageTypes,
  PublishMessage,
  PublishSuccessMessage,
  Situation,
  SituationChangeMessage,
  SituationChangesListener,
  SituationChangesListenerInstance,
  SpecialEvent,
  SubscribeSuccessMessage,
  TokenAuthentication,
};
