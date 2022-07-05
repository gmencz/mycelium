import { Situation, SituationChangesListener } from '@mycelium-now/core';
import { useEffect } from 'react';

/**
 * Adds the listener function to the end of the listeners array for situation changes
 * on the prefix.
 *
 * @param situationChangesListener The situation changes listener.
 * @param situation Situation to listen to.
 * @param callback Listener function to call on situation.
 */
export function useOnceSituationChange(
  situationChangesListener: SituationChangesListener | undefined,
  situation: Situation,
  callback: (channelName: string) => void
) {
  useEffect(() => {
    if (!situationChangesListener) {
      return;
    }

    situationChangesListener.once(situation, callback);

    return () => {
      situationChangesListener.offOnce(situation, callback);
    };
  }, [situationChangesListener, situation, callback]);
}
