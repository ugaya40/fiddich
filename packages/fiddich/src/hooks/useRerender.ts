import { useReducer } from 'react';

export function useRerender() {
  const forceUpdate = useReducer(x => x + 1, 0)[1];
  return () => forceUpdate();
}
