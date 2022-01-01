export enum CloseCode {
  UnknownError = 4000,
  UnknownOpCode = 4001,
  DecodeError = 4002,
  SessionTimedOut = 4003,
  NotAuthenticated = 4004,
  AuthenticationTimedOut = 4005,
  AlreadyAuthenticated = 4006,
  AuthenticationFailed = 4007
}

export enum CloseMessage {
  UnknownError = "We're not sure what went wrong. Try reconnecting?",
  UnknownOpCode = "You sent an invalid Rooms opcode or an invalid payload for an opcode. Don't do that!",
  DecodeError = "You sent an invalid payload to us. Don't do that!",
  SessionTimedOut = "Your session timed out. Reconnect and start a new one.",
  NotAuthenticated = "You sent us a payload prior to identifying.",
  AuthenticationTimedOut = "You didn't identify within 15 seconds of establishing the connection.",
  AlreadyAuthenticated = "You sent more than one identify payload. Don't do that!",
  AuthenticationFailed = "The identify payload is invalid."
}

export enum ReceiveOpCode {
  Hello = 0,
  HeartbeatACK = 2
}

export enum SendOpCode {
  Heartbeat = 1,
  JoinRoom = 3,
  Identify = 5
}
