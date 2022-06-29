import { useEffect, useState } from 'react';
import { useMycelium } from './use-mycelium';

function useUnsubscribe(channel: string) {
  const { connection } = useMycelium();

  return async () => {
    if (!connection) {
      return;
    }

    await connection.unsubscribe(channel);
  };
}

export { useUnsubscribe };
