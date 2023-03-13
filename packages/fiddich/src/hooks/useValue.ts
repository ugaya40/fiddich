import { useEffect } from 'react';
import { AsyncAtom, AsyncAtomFamily, AsyncAtomValueArg, Atom, AtomFamily, SyncAtom, SyncAtomFamily, SyncAtomValueArg } from '../atom';
import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { Selector, SelectorFamily } from '../selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useRerender } from './useRerender';
import { defaultCompareFunction, StateInstanceError } from '../util/util';
import { invalidStatusErrorText } from '../util/const';

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, noSuspense?: boolean): T => {
  const rerender = useRerender();

  const compare = stateInstance.state.compare ?? defaultCompareFunction;

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (noSuspense || ('noSuspense' in stateInstance.state && stateInstance.state.noSuspense)) {
        if (event.type === 'change by promise' || event.type === 'change') {
          if (!compare(event.oldValue, event.newValue)) {
            rerender();
          }
        }
      } else {
        if (event.type === 'waiting' || event.type === 'change') {
          rerender();
        }
      }
    });

    return () => listener.dispose();
  }, [stateInstance, stateInstance.storeId]);

  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else if ('abortRequest' in stateInstance.status) {
    throw stateInstance.status.promise;
  } else if (stateInstance.status.type === 'error') {
    throw new StateInstanceError(stateInstance, stateInstance.status.error);
  } else {
    throw new Error(invalidStatusErrorText);
  }
};

export type SelectorValueOption = {
  noSuspense?: boolean;
  place?: StorePlaceTypeHookContext;
};

export type AtomValueOption<T> = SelectorValueOption & {
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>;
};
export type SyncAtomValueOption<T> = AtomValueOption<T> & { initialValue?: SyncAtomValueArg<T> };
export type AsyncAtomValueOption<T> = AtomValueOption<T> & { initialValue?: AsyncAtomValueArg<T> };

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
  return useValueInternal(instance, option?.noSuspense);
}

export function useHierarchicalValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'hierarchical' }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}

export function useRootValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useRootValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useRootValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'root' }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}

export function useNamedRootValue<T>(rootName: string, state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'named', name: rootName }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}
