import { Channel, Listener } from '@mycelium-now/core';
import { useEffect, useState } from 'react';

/**
 * Publish an event.
 *
 * @param channel Mycelium channel to publish on
 */
export function usePublishEvent(channel: Channel | undefined) {
  const [state, setState] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
  });

  return {
    publish: async <TData = unknown,>(
      event: string,
      data: TData,
      includePublisher: boolean = false
    ) => {
      if (!channel) {
        return;
      }

      try {
        setState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
        });

        await channel.publish(event, data, includePublisher);

        setState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
        });
      } catch (error) {
        setState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: error as Error,
        });
      }
    },

    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
  };
}
