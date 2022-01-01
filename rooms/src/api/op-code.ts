export enum ReceiveOpCode {
  Hello = 0,
  HeartbeatACK = 2
}

export enum SendOpCode {
  Heartbeat = 1,
  JoinRoom = 3,
  Identify = 5
}
