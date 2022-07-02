import { Channel, Listener } from '@mycelium-now/core';

import invariant from 'invariant';
import { useEffect } from 'react';

/**
 * Adds a listener that will be fired when any event is emitted.
 *
 * @param channel Mycelium channel to listen to
 * @param listener Listener function to call when any event is emitted
 */
export function useOnAnyEvent<TData = unknown>(
  channel: Channel | undefined,
  listener: Listener<TData>
) {
  // error when required arguments aren't passed.
  invariant(listener, 'Must supply listener to useOnAnyEvent');

  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.onAny(listener);

    return () => {
      channel.offAny(listener);
    };
  }, [channel, listener]);
}
