import { useSyncExternalStore } from 'react';
import { State } from '../../state';
import { createComputed } from '../../createComputed';
import { getSuspense } from '../getSuspense';
import { initializeComputedState } from '../../stateUtil';

export function useValue<T>(state: State<T>): T {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      const watcher = createComputed(
        ({ get }) => get(state),
        { onScheduledNotify: onStoreChange }
      );
      
      initializeComputedState(watcher);
      
      return () => {
        watcher[Symbol.dispose]();
      };
    },
    () => getSuspense(state),
    () => getSuspense(state)
  );
  
  return value;
}