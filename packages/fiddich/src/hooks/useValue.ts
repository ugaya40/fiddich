import { useEffect } from 'react';
import { AsyncAtom, AsyncAtomFamily, AsyncAtomValueArg, Atom, AtomFamily, SyncAtom, SyncAtomFamily, SyncAtomValueArg } from '../atom';
import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { Selector, SelectorFamily } from '../selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useRerenderAsync } from './useRerender';
import { defaultCompareFunction, invalidStatusErrorText } from '../util/const';
import { useValueInfoEventEmitter } from '../globalFiddichEvent';

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, suppressSuspense?: boolean): T => {
  // Why not use useSyncExternalStore?
  //
  // Although using useSyncExternalStore wouldn't cause any additional renderings compared to the current method,
  // as of 2023-05-05, it may lead to multiple snapshot retrievals. This can negatively impact the developer's
  // ability to understand data flow with globalFiddichEvent. Therefore, we are not adopting the useSyncExternalStore
  // implementation at this time.

  const rerenderPure = useRerenderAsync();
  const rerender = (reason: 'waiting' | 'change' | 'change by promise' | 'reset' | 'error') => {
    rerenderPure();
    useValueInfoEventEmitter.fireRequestRerender(stateInstance, reason);
  };
  const compare = stateInstance.state.compare ?? defaultCompareFunction;
  const suppressSuspenseValue = suppressSuspense || ('suppressSuspense' in stateInstance.state && stateInstance.state.suppressSuspense);

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (suppressSuspenseValue) {
        if (event.type === 'change by promise' || event.type === 'change') {
          if (!compare(event.oldValue, event.newValue)) {
            rerender(event.type);
          }
        }
      } else {
        if (event.type === 'waiting' || event.type === 'change') {
          rerender(event.type);
        }
      }

      if (event.type === 'reset' || event.type === 'error') {
        rerender(event.type);
      }
    });

    return () => listener.dispose();
  }, [stateInstance, stateInstance.store.id, suppressSuspenseValue]);

  if (stateInstance.status.type === 'stable') {
    useValueInfoEventEmitter.fireReturnValue(stateInstance, stateInstance.status.value);
    return stateInstance.status.value;
  } else if ('abortRequest' in stateInstance.status) {
    // Even if this state suppresses Suspense,
    // the waiting status may be exposed by a re-rendering by another StateInstance.value.
    // In that case, the old value should be returned.
    if (suppressSuspenseValue && stateInstance.status.type === 'waiting') {
      useValueInfoEventEmitter.fireReturnValue(stateInstance, stateInstance.status.oldValue);
      return stateInstance.status.oldValue;
    } else {
      useValueInfoEventEmitter.fireThrowPromise(stateInstance, stateInstance.status.promise);
      throw stateInstance.status.promise;
    }
  } else if (stateInstance.status.type === 'error') {
    useValueInfoEventEmitter.fireThrowError(stateInstance, stateInstance.status.error);
    throw stateInstance.status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
};

export type SelectorValueOption = {
  suppressSuspense?: boolean;
  place?: StorePlaceTypeHookContext;
};

export type AtomValueOption<T> = SelectorValueOption & {
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>;
};
export type SyncAtomValueOption<T> = AtomValueOption<T> & {
  initialValue?: SyncAtomValueArg<T>;
};
export type AsyncAtomValueOption<T> = AtomValueOption<T> & {
  initialValue?: AsyncAtomValueArg<T>;
};

export type LimitedSelectorValueOption = Omit<SelectorValueOption, 'place'>;
export type LimitedAtomValueOption<T> = Omit<AtomValueOption<T>, 'place'>;

export type LimitedSyncAtomValueOption<T> = Omit<SyncAtomValueOption<T>, 'place'>;
export type LimitedAsyncAtomValueOption<T> = Omit<AsyncAtomValueOption<T>, 'place'>;

export function useValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: AsyncAtomValueOption<T>): T;
export function useValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: SyncAtomValueOption<T>): T;
export function useValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: AtomValueOption<T>): T;
export function useValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: SelectorValueOption): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T>): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T>): T {
  const instance = useInstance(state, option?.place ?? { type: 'normal' }, option?.initialValue);
  return useValueInternal(instance, option?.suppressSuspense);
}

export function useHierarchicalValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'hierarchical' }, option?.initialValue);
  return useValueInternal(instance, option?.suppressSuspense);
}

export function useRootValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useRootValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useRootValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'root' }, option?.initialValue);
  return useValueInternal(instance, option?.suppressSuspense);
}

export function useNamedStoreValue<T>(storeName: string, state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useNamedStoreValue<T>(storeName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'named', name: storeName }, option?.initialValue);
  return useValueInternal(instance, option?.suppressSuspense);
}

export function useContextValue<T>(contextKey: string, state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useContextValue<T>(contextKey: string, state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useContextValue<T>(contextKey: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useContextValue<T>(contextKey: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useContextValue<T>(contextKey: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useContextValue<T>(contextKey: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'context', key: contextKey }, option?.initialValue);
  return useValueInternal(instance, option?.suppressSuspense);
}
