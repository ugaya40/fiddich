import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { invalidStatusErrorText } from '../util/const';

export const useSnapshotInternal = <T>(stateInstance: FiddichStateInstance<T>): T | undefined => {
  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else if (stateInstance.status.type === 'waiting for initialize') {
    //It is reasonable that the "waiting for initialize" snapshot should be undefined without considering reset.
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

export function useSnapshot<T>(state: FiddichState<T>, option?: SnapshotOption): T | undefined {
  const instance = useInstance(state, option?.place ?? { type: 'normal' });
  return useSnapshotInternal(instance);
}

export function useHierarchicalSnapshot<T>(state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'hierarchical' });
  return useSnapshotInternal(instance);
}

export function useRootSnapshot<T>(state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'root' });
  return useSnapshotInternal(instance);
}

export function useNamedStoreSnapshot<T>(storeName: string, state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'named', name: storeName });
  return useSnapshotInternal(instance);
}

export function useContextSnapshot<T>(contextKey: string, state: FiddichState<T>): T | undefined {
  const instance = useInstance(state, { type: 'context', key: contextKey });
  return useSnapshotInternal(instance);
}
