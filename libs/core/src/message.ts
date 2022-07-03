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

export {
  ErrorMessage,
  HelloMessage,
  MessageTypes,
  Situation,
  PublishMessage,
  SituationChangeMessage,
  PublishSuccessMessage,
  SubscribeSuccessMessage,
};
