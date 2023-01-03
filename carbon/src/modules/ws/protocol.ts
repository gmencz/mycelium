import { User } from "../auth";
import { ClientMessage } from "./message";

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
}

export enum ServerToClientOpCode {
  Connected = 0,
}

export enum ClientToServerOpCode {
  Subscribe = 0,
  Unsubscribe = 1,
  Publish = 2,
}

export enum ServerToChannelOpCode {
  Ping = 0,
  Hello = 1,
}

export interface ServerToChannelHelloMessage {
  user: User | null;
}

export interface ServerToChannelMessage {
  opCode: ServerToChannelOpCode;
  data?: ServerToChannelHelloMessage;
}

export interface ServerToClientMessage {
  opCode: ServerToClientOpCode;
}

export const makeServerToClientMessage = (message: ServerToClientMessage) => {
  return JSON.stringify({
    op: message.opCode,
  });
};

export const makeServerToChannelMessage = (message: ServerToChannelMessage) => {
  return JSON.stringify({
    op: message.opCode,
    d: message.data,
  });
};

export const serverToReplicaPingInterval = 30000; // 30 seconds
