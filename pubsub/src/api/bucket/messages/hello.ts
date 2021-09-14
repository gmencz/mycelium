import { MyceliumOp } from "../protocol";
import { MyceliumMessage } from "./message";

interface HelloMessageData {
  clientId: string;
  heartbeatInterval: number;
}

class HelloMessage extends MyceliumMessage<HelloMessageData> {
  constructor(data: HelloMessageData) {
    super({
      op: MyceliumOp.Hello,
      d: data
    });
  }
}

export { HelloMessage };
