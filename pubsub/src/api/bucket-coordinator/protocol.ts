enum BucketCoordinatorOp {
  Hello,
  Heartbeat,
  HeartbeatACK,
  BucketJoined,
  BucketLeft
}

interface BucketCoordinatorMessagePayload<TData = any> {
  op: BucketCoordinatorOp;
  d?: TData;
}

export { BucketCoordinatorOp, BucketCoordinatorMessagePayload };
