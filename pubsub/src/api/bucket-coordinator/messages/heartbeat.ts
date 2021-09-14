import { BucketCoordinatorOp } from "../protocol";
import { BucketCoordinatorMessage } from "./message";

class HeartbeatMessage extends BucketCoordinatorMessage {
  constructor() {
    super({
      op: BucketCoordinatorOp.Heartbeat
    });
  }
}

export { HeartbeatMessage };
