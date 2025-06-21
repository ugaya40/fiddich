import { useSyncExternalStore, useCallback } from 'react';
import { State } from '../../state';
import { createComputed } from '../../createComputed';
import { getValueForSuspense } from '../getValueForSuspense';
import { initializeComputed } from '../../stateUtil/initializeComputed';

export function useValue<T>(state: State<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const watcher = createComputed(
        ({ get }) => get(state),
        { onScheduledNotify: onStoreChange }
      );
      
      initializeComputed(watcher);
      
      return () => {
        watcher[Symbol.dispose]();
      };
    },
    [state] // Only recreate when state changes
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getValueForSuspense(state),
    () => getValueForSuspense(state)
  );
  
  return value;
}