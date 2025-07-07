import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { computed } from '../../computed';
import type { State } from '../../state';
import { getValueForSuspense } from '../getValueForSuspense';

export function useValue<T>(state: State<T>): T {
  // Wrapper object ensures referential inequality on each notification.
  // This is necessary because useSyncExternalStore relies on Object.is() comparison
  // to detect changes. With mutable-first design, the actual value reference might
  // not change even when the content does. By creating a new wrapper object on each
  // notification, we guarantee that React will detect the change and re-render.
  const wrapperRef = useRef<{value: T} | null>(null);

  const batchFrameRef = useRef<number | null>(null);

  const batchedNotify = useCallback(
    (onStoreChange: () => void) => {
      if (batchFrameRef.current == null) {
        batchFrameRef.current = requestAnimationFrame(() => {
          batchFrameRef.current = null;
          wrapperRef.current = null;
          onStoreChange();
        });
      }
    },[]
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const watcher = computed(({ get }) => get(state),{
        onNotify: () => batchedNotify(onStoreChange)
      });

      return () => {
        watcher[Symbol.dispose]();
      };
    },
    [state] // Only recreate when state changes
  );

  const getSnapshot = useCallback(() => {
    const value = getValueForSuspense(state); // This may throw for Suspense
    if (!wrapperRef.current) {
      wrapperRef.current = {value};
    }
    return wrapperRef.current;
  },[state])

  const store = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  useEffect(() => {
    return () => {
      if (batchFrameRef.current != null) {
        cancelAnimationFrame(batchFrameRef.current);
      }
    };
  }, []);

  return store.value;
}
