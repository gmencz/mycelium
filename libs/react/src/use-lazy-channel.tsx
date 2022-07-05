import { Channel } from '@mycelium-now/core';
import { useEffect, useState } from 'react';
import { useMyceliumClient } from './use-mycelium-client';

/**
 * Subscribe/unsubscribe to a channel lazily.
 *
 * @example
 * ```typescript
 * const channel = useLazyChannel()
 *
 * const onClickSubscribeButton = () => {
 *    channel.subscribe("my-channel")
 * }
 *
 * const onClickUnsubscribeButton = () => {
 *    channel.unsubscribe()
 * }
 * ```
 */
export function useLazyChannel() {
  const { client } = useMyceliumClient();
  const [channel, setChannel] = useState<Channel>();
  const [state, setState] = useState({
    isSubscribing: false,
    isUnsubscribing: false,
    isSubscribed: false,
    isError: false,
    error: null as Error | null,
  });

  useEffect(() => {
    // Cleanup on unmount/re-render
    return () => {
      channel?.instance.unsubscribe().catch(console.error);
    };
  }, [client]);

  return {
    subscribe: async (channelName: string) => {
      if (!client) {
        return;
      }

      try {
        setState({
          isSubscribing: true,
          isUnsubscribing: false,
          isSubscribed: false,
          isError: false,
          error: null,
        });

        setChannel(await client.getOrSubscribeToChannel(channelName));

        setState({
          isSubscribing: false,
          isUnsubscribing: false,
          isSubscribed: true,
          isError: false,
          error: null,
        });
      } catch (error) {
        setState({
          isSubscribing: false,
          isUnsubscribing: false,
          isSubscribed: false,
          isError: true,
          error: error as Error,
        });
      }
    },

    unsubscribe: async () => {
      if (!channel || !client) {
        console.warn(`Called unsubscribe() without being subscribed`);
        return;
      }

      try {
        setState({
          isSubscribing: false,
          isUnsubscribing: true,
          isSubscribed: false,
          isError: false,
          error: null,
        });

        await channel.instance.unsubscribe();
        setChannel(undefined);

        setState({
          isSubscribing: false,
          isUnsubscribing: false,
          isSubscribed: false,
          isError: false,
          error: null,
        });
      } catch (error) {
        setState({
          isSubscribing: false,
          isUnsubscribing: false,
          isSubscribed: false,
          isError: true,
          error: error as Error,
        });
      }
    },

    channel,

    isSubscribing: state.isSubscribing,
    isUnsubscribing: state.isUnsubscribing,
    isSubscribed: state.isSubscribed,
    isError: state.isError,
    error: state.error,
  };
}
