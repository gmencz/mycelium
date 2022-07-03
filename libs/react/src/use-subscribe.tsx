import { Channel } from '@mycelium-now/core';
import { useEffect, useState } from 'react';
import invariant from 'invariant';
import { useMyceliumClient } from './use-mycelium-client';

/**
 * Subscribe to a channel lazily.
 *
 * @example
 * ```typescript
 * const channel = useChannel("my-channel")
 * channel.on("some-event", (data) => {
 *    // Do something with data
 * })
 * ```
 */
export function useSubscribe() {
  const { client } = useMyceliumClient();
  const [channel, setChannel] = useState<Channel>();
  const [state, setState] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
  });

  useEffect(() => {
    // Cleanup on unmount/re-render
    return () => {
      channel?.unsubscribe().catch(console.error);
    };
  }, [client]);

  return {
    subscribe: async (channelName: string) => {
      if (!client) {
        return;
      }

      try {
        setState({
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
        });

        setChannel(await client.channel(channelName));

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

    channel,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
  };
}