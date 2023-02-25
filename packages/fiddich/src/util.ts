import { globalStoreMap, Store } from './core';

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
