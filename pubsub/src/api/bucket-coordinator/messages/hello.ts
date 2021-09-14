import { BucketCoordinatorOp } from "../protocol";
import { BucketCoordinatorMessage } from "./message";

interface Bucket {
  name: string;
}

interface HelloMessageData {
  buckets: Bucket[];
  heartbeatInterval: number;
}

class HelloMessage extends BucketCoordinatorMessage<HelloMessageData> {
  constructor(data: HelloMessageData) {
    super({
      op: BucketCoordinatorOp.Hello,
      d: data
    });
  }
}

export { HelloMessage, HelloMessageData };
