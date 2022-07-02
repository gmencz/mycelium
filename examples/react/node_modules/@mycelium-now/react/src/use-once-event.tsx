import { Channel, Listener } from '@mycelium-now/core';

import invariant from 'invariant';
import { useEffect } from 'react';

/**
 * Adds a one-time listener function for the event.
 *
 * @param channel Mycelium channel to listen to
 * @param event Name of event to listen to
 * @param listener Listener function to call on a new event
 */
export function useOnceEvent<TData = unknown>(
  channel: Channel | undefined,
  event: string,
  listener: Listener<TData>
) {
  // error when required arguments aren't passed.
  invariant(event, 'Must supply event to useOnceEvent');
  invariant(listener, 'Must supply listener to useOnceEvent');

  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.once(event, listener);

    return () => {
      channel.offOnce(event, listener);
    };
  }, [channel, event, listener]);
}
