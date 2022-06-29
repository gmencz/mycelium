import { useEffect, useState } from 'react';
import { useMycelium } from './use-mycelium';

function usePublish(
  channel: string,
  data: unknown,
  includePublisher?: boolean
) {
  const { connection } = useMycelium();

  return async () => {
    if (!connection) {
      return;
    }

    await connection.publish(channel, data, includePublisher);
  };
}

export { usePublish };
