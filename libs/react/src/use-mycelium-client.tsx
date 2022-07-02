import { useContext } from 'react';
import { MyceliumContext } from './mycelium-provider';

export const NOT_IN_CONTEXT_WARNING =
  'No Mycelium context. Did you forget to wrap your app in a <MyceliumProvider />?';

export function useMyceliumClient() {
  const ctx = useContext(MyceliumContext);

  if (ctx == null) {
    throw new Error(NOT_IN_CONTEXT_WARNING);
  }

  return ctx;
}
