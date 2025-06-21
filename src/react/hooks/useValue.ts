import { useCallback, useSyncExternalStore } from 'react';
import { createComputed } from '../../createComputed';
import type { State } from '../../state';
import { initializeComputed } from '../../stateUtil/initializeComputed';
import { getValueForSuspense } from '../getValueForSuspense';

export function useValue<T>(state: State<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const watcher = createComputed(({ get }) => get(state), { onScheduledNotify: onStoreChange });

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
