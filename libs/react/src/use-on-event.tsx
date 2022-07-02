import { Channel, Listener } from '@mycelium-now/core';

import invariant from 'invariant';
import { useEffect } from 'react';

/**
 * Adds the listener function to the end of the listeners array for the event.
 *
 * @param channel Mycelium channel to listen to
 * @param event Name of event to listen to
 * @param listener Listener function to call on a new event
 */
export function useOnEvent<TData = unknown>(
  channel: Channel | undefined,
  event: string,
  listener: Listener<TData>
) {
  // error when required arguments aren't passed.
  invariant(event, 'Must supply event to useOnEvent');
  invariant(listener, 'Must supply listener to useOnEvent');

  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.on(event, listener);

    return () => {
      channel.off(event, listener);
    };
  }, [channel, event, listener]);
}
