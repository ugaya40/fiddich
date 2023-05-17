import { Atom, AtomFamily } from '../atom/atom';
import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { Selector, SelectorFamily } from '../selector/selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { invalidStatusErrorText } from '../util/const';

export const useSnapshotInternal = <T>(stateInstance: FiddichStateInstance<T>): T | undefined => {
  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else if (stateInstance.status.type === 'waiting for initialize') {
    return undefined;
  } else if (stateInstance.status.type === 'waiting') {
    return stateInstance.status.oldValue;
  } else if (stateInstance.status.type === 'error') {
    throw stateInstance.status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
};

export type SnapshotOption = {
  place?: StorePlaceTypeHookContext;
};

export function useSnapshot<T>(state: Atom<T> | AtomFamily<T, any>, option?: SnapshotOption): T | undefined;
export function useSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>, option?: SnapshotOption): T | undefined;
export function useSnapshot<T>(state: FiddichState<T>, option?: SnapshotOption): T | undefined;
export function useSnapshot<T>(state: FiddichState<T>, option?: SnapshotOption): T | undefined {
  const instance = useInstance(state, option?.place ?? { type: 'normal' });
  return useSnapshotInternal(instance);
}

export function useHierarchicalSnapshot<T>(state: Atom<T> | AtomFamily<T, any>): T | undefined;
export function useHierarchicalSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>): T | undefined;
export function useHierarchicalSnapshot<T>(state: FiddichState<T>): T | undefined;
export function useHierarchicalSnapshot<T>(state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'hierarchical' });
  return useSnapshotInternal(instance);
}

export function useRootSnapshot<T>(state: Atom<T> | AtomFamily<T, any>): T | undefined;
export function useRootSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>): T | undefined;
export function useRootSnapshot<T>(state: FiddichState<T>): T | undefined;
export function useRootSnapshot<T>(state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'root' });
  return useSnapshotInternal(instance);
}

export function useNamedStoreSnapshot<T>(storeName: string, state: Atom<T> | AtomFamily<T, any>): T | undefined;
export function useNamedStoreSnapshot<T>(storeName: string, state: Selector<T> | SelectorFamily<T, any>): T | undefined;
export function useNamedStoreSnapshot<T>(storeName: string, state: FiddichState<T>): T | undefined;
export function useNamedStoreSnapshot<T>(storeName: string, state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'named', name: storeName });
  return useSnapshotInternal(instance);
}

export function useContextSnapshot<T>(contextKey: string, state: Atom<T> | AtomFamily<T, any>): T | undefined;
export function useContextSnapshot<T>(contextKey: string, state: Selector<T> | SelectorFamily<T, any>): T | undefined;
export function useContextSnapshot<T>(contextKey: string, state: FiddichState<T>): T | undefined;
export function useContextSnapshot<T>(contextKey: string, state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'context', key: contextKey });
  return useSnapshotInternal(instance);
}
