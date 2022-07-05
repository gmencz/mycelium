import { SituationChangesListener } from '@mycelium-now/core';
import { useEffect, useState } from 'react';
import { useMyceliumClient } from './use-mycelium-client';

/**
 * Listens to situation changes on channel prefix.
 * @param channelPrefix The name of the channel you want to subscribe to.
 * @returns The situation changes listener.
 *
 * @example
 * ```typescript
 * const listener = useSituationChangeListener("user-")
 * listener.on(Situation.Occupied, (channelName) => {
 *    console.log(`Someone just occupied the channel ${channelName}!`)
 * })
 *
 * listener.on(Situation.Vacant, (channelName) => {
 *    console.log(`The channel ${channelName} is now vacant!`)
 * })
 * ```
 */
export function useSituationChangeListener(channelPrefix: string) {
  const { client, isConnected } = useMyceliumClient();
  const [situationChangesListener, setSituationChangesListener] =
    useState<SituationChangesListener>();
  const [state, setState] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
  });

  useEffect(() => {
    async function _listen() {
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

        setSituationChangesListener(
          await client.getOrListenToSituationChanges(channelPrefix)
        );

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

    _listen();

    // Cleanup on unmount/re-render
    return () => {
      client?.unlistenToSituationChanges(channelPrefix).catch(console.error);
    };
  }, [client]);

  return {
    situationChangesListener,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
  };
}
