import { ReceiveOpCode } from "./codes";

class Message<TData = any> {
  #op: ReceiveOpCode;
  #data?: TData;

  constructor(op: ReceiveOpCode, data?: TData) {
    this.#op = op;
    this.#data = data;
  }

  toJSON() {
    return JSON.stringify({
      op: this.#op,
      d: this.#data
    });
  }
}

export class HeartbeatACKMessage extends Message {
  constructor() {
    super(ReceiveOpCode.HeartbeatACK);
  }
}

interface HelloMessageData {
  sid: string;
}

export class HelloMessage extends Message<HelloMessageData> {
  constructor(data: HelloMessageData) {
    super(ReceiveOpCode.Hello, data);
  }
}

export class IdentifySuccessMessage extends Message {
  constructor() {
    super(ReceiveOpCode.IdentifySuccess);
  }
}
