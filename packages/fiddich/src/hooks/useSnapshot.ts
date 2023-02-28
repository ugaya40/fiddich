import { Atom, AtomFamily } from '../atom';
import { FiddichState, FiddichStateInstance, UninitializedStatus } from '../share';
import { Selector, SelectorFamily } from '../selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';

export const useSnapshotInternal = <T>(stateInstance: FiddichStateInstance<T>): T => {
  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else if (stateInstance.status.type === 'uninitialized') {
    throw (stateInstance.status as UninitializedStatus<T>).promise!;
  } else {
    return stateInstance.status.oldValue!;
  }
};

export type SnapshotOption = {
  place?: StorePlaceTypeHookContext;
};

export function useSnapshot<T>(state: Atom<T> | AtomFamily<T, any>, option?: SnapshotOption): T;
export function useSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>, option?: SnapshotOption): T;
export function useSnapshot<T>(state: FiddichState<T>, option?: SnapshotOption): T;
export function useSnapshot<T>(state: FiddichState<T>, option?: SnapshotOption): T {
  const instance = useInstance(state, option?.place ?? { type: 'normal' });
  return useSnapshotInternal(instance);
}

export function useHierarchicalSnapshot<T>(state: Atom<T> | AtomFamily<T, any>): T;
export function useHierarchicalSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>): T;
export function useHierarchicalSnapshot<T>(state: FiddichState<T>): T;
export function useHierarchicalSnapshot<T>(state: FiddichState<T>): T {
  const instance = useInstance(state, { type: 'hierarchical' });
  return useSnapshotInternal(instance);
}

export function useRootSnapshot<T>(state: Atom<T> | AtomFamily<T, any>): T;
export function useRootSnapshot<T>(state: Selector<T> | SelectorFamily<T, any>): T;
export function useRootSnapshot<T>(state: FiddichState<T>): T;
export function useRootSnapshot<T>(state: FiddichState<T>): T {
  const instance = useInstance(state, { type: 'root' });
  return useSnapshotInternal(instance);
}

export function useNamedRootSnapshot<T>(rootName: string, state: Atom<T> | AtomFamily<T, any>): T;
export function useNamedRootSnapshot<T>(rootName: string, state: Selector<T> | SelectorFamily<T, any>): T;
export function useNamedRootSnapshot<T>(rootName: string, state: FiddichState<T>): T;
export function useNamedRootSnapshot<T>(rootName: string, state: FiddichState<T>): T {
  const instance = useInstance(state, { type: 'named', name: rootName });
  return useSnapshotInternal(instance);
}
