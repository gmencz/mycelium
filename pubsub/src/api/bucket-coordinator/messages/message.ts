import { BucketCoordinatorMessagePayload } from "../protocol";

class BucketCoordinatorMessage<TData = any> {
  private payload: BucketCoordinatorMessagePayload<TData>;

  constructor(payload: BucketCoordinatorMessagePayload<TData>) {
    this.payload = payload;
  }

  public toJSON(): string {
    return JSON.stringify(this.payload);
  }
}

export { BucketCoordinatorMessage };
