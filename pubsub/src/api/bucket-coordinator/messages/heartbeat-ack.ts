import { BucketCoordinatorOp } from "../protocol";
import { BucketCoordinatorMessage } from "./message";

class HeartbeatACKMessage extends BucketCoordinatorMessage {
  constructor() {
    super({
      op: BucketCoordinatorOp.HeartbeatACK
    });
  }
}

export { HeartbeatACKMessage };
