import { Channel } from '@mycelium-now/core';
import { useEffect, useState } from 'react';
import invariant from 'invariant';
import { useMyceliumClient } from './use-mycelium-client';

/**
 * Subscribe to a channel.
 * @param channelName The name of the channel you want to subscribe to.
 * @returns Instance of the channel you just subscribed to.
 *
 * @example
 * ```typescript
 * const channel = useChannel("my-channel")
 * channel.on("some-event", (data) => {
 *    // Do something with data
 * })
 * ```
 */
export function useChannel(channelName: string) {
  invariant(channelName, 'Must supply channelName to useChannel');

  const { client, isConnected } = useMyceliumClient();
  const [channel, setChannel] = useState<Channel>();
  const [state, setState] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
  });

  useEffect(() => {
    async function _subscribe() {
      // Return early if there's no client or if it's not connected
      if (!client || !isConnected) {
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
    }

    _subscribe();

    // Cleanup on unmount/re-render
    return () => {
      channel?.unsubscribe().catch(console.error);
    };
  }, [client]);

  return {
    channel,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
  };
}
