import { createContext, ReactNode, useEffect, useState } from 'react';
import { ConnectionOptions, connect, Connection } from '@mycelium/web';

type Status = 'idle' | 'loading' | 'error' | 'success';

interface MyceliumContextValue {
  connection: Connection | null;
  status: Status;
  error: string | null;
}

const MyceliumContext = createContext<MyceliumContextValue | null>(null);

interface MyceliumProviderProps extends ConnectionOptions {
  children: ReactNode;
}

function MyceliumProvider({ authentication, children }: MyceliumProviderProps) {
  const [state, setState] = useState<MyceliumContextValue>({
    connection: null,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    async function _connect() {
      try {
        setState({
          connection: null,
          status: 'loading',
          error: null,
        });

        const connection = await connect({ authentication });

        setState({
          connection,
          status: 'success',
          error: null,
        });
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          setState({
            connection: null,
            status: 'success',
            error: error.message,
          });
        } else {
          setState({
            connection: null,
            status: 'success',
            error: 'Unknown error',
          });
        }
      }
    }

    _connect();
  }, [authentication]);

  return (
    <MyceliumContext.Provider value={state}>
      {children}
    </MyceliumContext.Provider>
  );
}

export { MyceliumProvider, MyceliumContext };
