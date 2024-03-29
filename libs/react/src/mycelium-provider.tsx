import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { Client, Connection } from '@mycelium-now/core';
import useDeepCompareEffect from 'use-deep-compare-effect';

export interface MyceliumContextValue {
  isConnecting: boolean;
  isConnected: boolean;
  isError: boolean;
  error: Error | null;
  client: Client | null;
}

// Context setup
export const MyceliumContext = createContext<MyceliumContextValue | null>(null);

/**
 * Props for `<MyceliumProvider />`.
 */
interface MyceliumProviderProps extends Omit<Connection, 'manual'> {
  children: ReactNode;
}

/**
 * Provider that creates a Mycelium client and provides it to child hooks throughout your app.
 * @param props Connection options for the Mycelium client
 */
export function MyceliumProvider({
  authentication,
  baseURL,
  children,
}: MyceliumProviderProps) {
  const [state, setState] = useState<MyceliumContextValue>({
    isConnecting: false,
    isConnected: false,
    isError: false,
    error: null,
    client: null,
  });

  useDeepCompareEffect(() => {
    async function _connect() {
      try {
        setState({
          isConnecting: true,
          isConnected: false,
          isError: false,
          error: null,
          client: null,
        });

        const client = new Client({
          authentication,
          baseURL,
          manual: true,
        });

        await client.connect({ authentication, baseURL });

        setState({
          isConnecting: false,
          isConnected: true,
          isError: false,
          error: null,
          client,
        });
      } catch (error) {
        setState({
          isConnecting: false,
          isConnected: true,
          isError: true,
          error: error as Error,
          client: null,
        });
      }
    }

    _connect();

    return () => {
      state.client?.disconnect();
    };
  }, [authentication, baseURL]);

  return (
    <MyceliumContext.Provider value={state}>
      {children}
    </MyceliumContext.Provider>
  );
}
