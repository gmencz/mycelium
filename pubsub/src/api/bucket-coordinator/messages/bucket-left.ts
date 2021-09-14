import { BucketCoordinatorOp } from "../protocol";
import { BucketCoordinatorMessage } from "./message";

interface BucketLeftData {
  name: string;
}

class BucketLeftMessage extends BucketCoordinatorMessage<BucketLeftData> {
  constructor(data: BucketLeftData) {
    super({
      op: BucketCoordinatorOp.BucketLeft,
      d: data
    });
  }
}

export { BucketLeftMessage };
