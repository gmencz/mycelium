import { useEffect, useState } from 'react';
import { useMycelium } from './use-mycelium';

interface UseSubscription {
  error: string | null;
}

function useSubscribe(channel: string) {
  const { connection } = useMycelium();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function _subscribe() {
      if (!connection) {
        return;
      }

      try {
        await connection.subscribe(channel);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Unknown error');
        }
      }
    }

    _subscribe();

    return () => {
      connection?.unsubscribe(channel);
    };
  }, [channel, connection]);

  return { error };
}

export { useSubscribe };
