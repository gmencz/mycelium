import { Channel } from '@mycelium-now/core';
import { useEffect } from 'react';

/**
 * Adds the listener function to the end of the listeners array for the event.
 *
 * @param channel Mycelium channel to listen to
 * @param event Name of event to listen to
 * @param callback Listener function to call on a new event
 */
export function useOnEvent<TData = unknown>(
  channel: Channel | undefined,
  event: string,
  callback: (data: TData) => void
) {
  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.on(event, callback);

    return () => {
      channel.off(event, callback);
    };
  }, [channel, event, callback]);
}
