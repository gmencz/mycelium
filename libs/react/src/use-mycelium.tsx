import { useContext } from 'react';
import { MyceliumContext } from './mycelium-provider';

const NOT_IN_CONTEXT_WARNING =
  'No Mycelium context. Did you forget to wrap your app in a <MyceliumProvider />?';

function useMycelium() {
  const context = useContext(MyceliumContext);

  if (context == null) {
    throw new Error(NOT_IN_CONTEXT_WARNING);
  }

  return context;
}

export { useMycelium, NOT_IN_CONTEXT_WARNING };
