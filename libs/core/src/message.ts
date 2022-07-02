enum MessageTypes {
  Hello = 'hello',
  Error = 'error',
  Subscribe = 'subscribe',
  SubscribeSucess = 'subscribe_success',
  Unsubscribe = 'unsubscribe',
  UnsubscribeSuccess = 'unsubscribe_success',
  Publish = 'publish',
  PublishSuccess = 'publish_success',
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

interface ErrorMessage {
  s?: number;
  t: MessageTypes;
  r: string;
}

export {
  ErrorMessage,
  HelloMessage,
  MessageTypes,
  PublishMessage,
  PublishSuccessMessage,
  SubscribeSuccessMessage,
};
