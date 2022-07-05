type CallbackFunction<Param = unknown> = (param: Param) => void;

interface CallbackContainer<EventId> {
  eventId: EventId;
  callback: CallbackFunction<any>;
}

class InstanceWithEvents<Instance, EventId = string> {
  private genericCallbacks: CallbackContainer<EventId>[] = [];
  private onceCallbacks: CallbackContainer<EventId>[] = [];

  constructor(public instance: Instance) {}

  public handleEvent<Param = unknown>(eventId: EventId, param: Param) {
    this.genericCallbacks.forEach((c) => {
      if (c.eventId === eventId) {
        c.callback(param);
      }
    });

    this.onceCallbacks.find((c) => c.eventId === eventId)?.callback(param);
  }

  public on<Param = unknown>(
    eventId: EventId,
    callback: CallbackFunction<Param>
  ) {
    this.genericCallbacks.push({
      eventId,
      callback,
    });
  }

  public off<Param = unknown>(
    eventId: EventId,
    callback: CallbackFunction<Param>
  ) {
    this.genericCallbacks = this.genericCallbacks.filter(
      (c) => c.eventId !== eventId && c.callback === callback
    );
  }

  public once<Param = unknown>(
    eventId: EventId,
    callback: CallbackFunction<Param>
  ) {
    this.onceCallbacks = [
      ...this.onceCallbacks.filter((c) => c.eventId !== eventId),
      {
        eventId,
        callback,
      },
    ];
  }

  public offOnce<Param = unknown>(
    eventId: EventId,
    callback: CallbackFunction<Param>
  ) {
    this.onceCallbacks = this.onceCallbacks.filter(
      (c) => c.eventId !== eventId && c.callback === callback
    );
  }

  public removeAllListeners(...eventIds: EventId[]) {
    if (!eventIds.length) {
      // Remove all callbacks
      this.genericCallbacks = [];
      return;
    }

    this.genericCallbacks = this.genericCallbacks.filter(
      (c) => !eventIds.some((eventId) => c.eventId === eventId)
    );
  }
}

export { InstanceWithEvents };
