import { Channel, Listener } from '@mycelium-now/core';

import invariant from 'invariant';
import { useEffect } from 'react';

/**
 * Adds a listener that will be fired when any event is emitted. The listener is added to the beginning of the listeners array.
 *
 * @param channel Mycelium channel to listen to
 * @param listener Listener function to call when any event is emitted
 */
export function usePrependAnyEvent<TData = unknown>(
  channel: Channel | undefined,
  listener: Listener<TData>
) {
  // error when required arguments aren't passed.
  invariant(listener, 'Must supply listener to usePrependAnyEvent');

  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.prependAny(listener);

    return () => {
      channel.offAny(listener);
    };
  }, [channel, listener]);
}
