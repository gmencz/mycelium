import { User } from "../auth";

export enum CloseCode {
  MISSING_APP_ID = 4000,
  APP_NOT_FOUND = 4001,
  INVALID_MESSAGE = 4002,
  INVALID_MESSAGE_OP = 4003,
  FAILED_TO_CONNECT_TO_REPLICA = 4004,
  INVALID_USER_TOKEN = 4005,
  INTERNAL_SERVER_ERROR = 4006,
  NOT_SUBSCRIBED = 4007,
  INVALID_MESSAGE_DATA = 4008,
  ALREADY_SUBSCRIBED_TO_CHANNEL = 4009,
  NOT_SUBSCRIBED_TO_CHANNEL = 4010,
  FAILED_TO_UNSUBSCRIBE = 4011,
}

export enum ServerToClientOpCode {
  Connected = 0,
  ReceivedMessage = 1,
  UserSubscribed = 2,
  UserUnsubscribed = 3,
  Pong = 4,
}

export enum ClientToServerOpCode {
  Subscribe = 0,
  Unsubscribe = 1,
  Publish = 2,
  Ping = 3,
}

export enum ServerToChannelOpCode {
  Ping = 0,
  Hello = 1,
  Broadcast = 2,
}

export interface ServerToChannelHelloMessage {
  u: User | null;
}

export interface ServerToChannelBroadcastMessage {
  m: string;
}

export interface ServerToClientReceivedBroadcastMessage {
  m: string;
}

export interface ServerToClientUserSubscribedMessage {
  u: User | "anon";
}

export interface ServerToChannelMessage {
  opCode: ServerToChannelOpCode;
  data?: ServerToChannelHelloMessage | ServerToChannelBroadcastMessage;
}

export interface ServerToClientMessage {
  opCode: ServerToClientOpCode;
  data?:
    | ServerToClientReceivedBroadcastMessage
    | ServerToClientUserSubscribedMessage;
}

export const makeServerToClientMessage = (
  message: ServerToClientMessage,
  toJSON: boolean = true
) => {
  const minified = {
    op: message.opCode,
    d: message.data,
  };

  return toJSON ? JSON.stringify(minified) : minified;
};

export const makeServerToChannelMessage = (message: ServerToChannelMessage) => {
  return JSON.stringify({
    op: message.opCode,
    d: message.data,
  });
};

export const serverToChannelPingInterval = 30000; // 30 seconds
