enum MyceliumOp {
  Hello,
  Heartbeat,
  HeartbeatACK,
  Publish,
  Message
}

interface MyceliumMessagePayload<TData = any> {
  op: MyceliumOp;
  d?: TData;
}

enum MyceliumCloseCode {
  UnknownError = 4000,
  UnknownOpcode = 4001,
  InvalidPayload = 4002
}

enum MyceliumCloseMessage {
  UnknownError = "We're not sure what went wrong. Try reconnecting?",
  UnknownOpcode = "You sent an invalid opcode or an invalid payload for an opcode. Don't do that!",
  InvalidPayload = "You sent an invalid payload to us. Don't do that!"
}

export {
  MyceliumMessagePayload,
  MyceliumOp,
  MyceliumCloseCode,
  MyceliumCloseMessage
};
