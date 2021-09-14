import { BucketCoordinatorOp } from "../protocol";
import { BucketCoordinatorMessage } from "./message";

interface BucketJoinedData {
  name: string;
}

class BucketJoinedMessage extends BucketCoordinatorMessage<BucketJoinedData> {
  constructor(data: BucketJoinedData) {
    super({
      op: BucketCoordinatorOp.BucketJoined,
      d: data
    });
  }
}

export { BucketJoinedMessage };
