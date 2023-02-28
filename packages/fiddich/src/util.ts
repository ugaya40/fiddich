import { FiddichStateInstance, globalStoreMap, Store } from './share';

export function getNamedStore(name: string): Store {
  const store = globalStoreMap.get(name);
  if (store == null) throw new Error(`Store named '${name}' not found.`);
  return store;
}

export function getRootStore(store: Store): Store {
  if ('parent' in store) {
    return getRootStore(store.parent);
  } else {
    return store;
  }
}

export const getOldValue = <T>(instance: FiddichStateInstance<T>) => {
  return instance.status.type === 'stable' ? instance.status.value : instance.status.type === 'uninitialized' ? undefined : instance.status.oldValue;
};
