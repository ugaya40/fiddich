import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { computed } from '../../computed';
import { get } from '../../get';
import type { State } from '../../state';
import { getValueForSuspense } from '../getValueForSuspense';

type UseValueInternalOptions = {
  suspense: boolean;
};

export function useValueInternal<T>(state: State<T>, options: UseValueInternalOptions): [isPending: boolean, value: T] {
  const { suspense } = options;

  // Wrapper object ensures referential inequality on each notification.
  // This is necessary because useSyncExternalStore relies on Object.is() comparison
  // to detect changes. With mutable-first design, the actual value reference might
  // not change even when the content does. By creating a new wrapper object on each
  // notification, we guarantee that React will detect the change and re-render.
  const wrapperRef = useRef<{ isPending: boolean; value: T } | null>(null);

  const batchFrameRef = useRef<number | null>(null);

  const batchedNotify = useCallback((onStoreChange: () => void) => {
    if (batchFrameRef.current == null) {
      batchFrameRef.current = requestAnimationFrame(() => {
        batchFrameRef.current = null;
        wrapperRef.current = null;
        onStoreChange();
      });
    }
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const watcher = computed(({ get }) => get(state), {
        onNotify: () => batchedNotify(onStoreChange),
        onPendingChange: () => batchedNotify(onStoreChange),
      });

      return () => {
        watcher[Symbol.dispose]();
      };
    },
    [state, batchedNotify]
  );

  const getSnapshot = useCallback(() => {
    const isPending = state.pendingPromise != null;
    const value = suspense ? getValueForSuspense(state) : get(state);
    if (!wrapperRef.current) {
      wrapperRef.current = { isPending, value };
    }
    return wrapperRef.current;
  }, [state, suspense]);

  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    return () => {
      if (batchFrameRef.current != null) {
        cancelAnimationFrame(batchFrameRef.current);
      }
    };
  }, []);

  return [store.isPending, store.value];
}
