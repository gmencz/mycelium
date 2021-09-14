import { MyceliumMessagePayload } from "../protocol";

class MyceliumMessage<TData = any> {
  private payload: MyceliumMessagePayload<TData>;

  constructor(payload: MyceliumMessagePayload<TData>) {
    this.payload = payload;
  }

  public toJSON(): string {
    return JSON.stringify(this.payload);
  }
}

export { MyceliumMessage };
