import { MyceliumOp } from "../protocol";
import { MyceliumMessage } from "./message";

class MessageMessage extends MyceliumMessage {
  constructor(data: any) {
    super({
      op: MyceliumOp.Message,
      d: data
    });
  }
}

export { MessageMessage };
