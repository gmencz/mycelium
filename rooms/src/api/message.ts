import { object, string } from "zod";
import { ReceiveOpCode } from "./op-code";

export const joinRoomSchema = object({
  name: string()
});

export const identifySchema = object({
  appId: string(), // The id of the app.
  signature: string() // The signature, created with the private app's signing key.
});

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
