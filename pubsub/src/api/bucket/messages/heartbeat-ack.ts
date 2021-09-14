import { MyceliumOp } from "../protocol";
import { MyceliumMessage } from "./message";

class HeartbeatACKMessage extends MyceliumMessage {
  constructor() {
    super({
      op: MyceliumOp.HeartbeatACK
    });
  }
}

export { HeartbeatACKMessage };
