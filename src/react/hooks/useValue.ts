import { useSyncExternalStore, useCallback } from 'react';
import { State } from '../../state';
import { createComputed } from '../../createComputed';
import { getSuspense } from '../getSuspense';
import { initializeComputedState } from '../../stateUtil';

export function useValue<T>(state: State<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const watcher = createComputed(
        ({ get }) => get(state),
        { onScheduledNotify: onStoreChange }
      );
      
      initializeComputedState(watcher);
      
      return () => {
        watcher[Symbol.dispose]();
      };
    },
    [state] // Only recreate when state changes
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getSuspense(state),
    () => getSuspense(state)
  );
  
  return value;
}