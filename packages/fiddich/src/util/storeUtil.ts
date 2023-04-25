import { Store, StorePlaceType } from '../shareTypes';
import { nameAndGlobalNamedStoreMap, notFoundContextStoreErrorText, notFoundNamedStoreErrorText } from './const';

export function getRootStore(store: Store): Store {
  if ('parent' in store) {
    return getRootStore(store.parent);
  } else {
    return store;
  }
}

export function getContextStore(contextKey: string, store: Store): Store {
  if (store.contextKey === contextKey) {
    return store;
  } else {
    if ('parent' in store) {
      return getContextStore(contextKey, store.parent);
    } else {
      throw new Error(notFoundContextStoreErrorText(contextKey));
    }
  }
}

export function getNewValueStore(storePlaceType: StorePlaceType): Store {
  if (storePlaceType.type === 'named') {
    const namedStoreResult = nameAndGlobalNamedStoreMap.get(storePlaceType.name)!;
    if (namedStoreResult != null) {
      return namedStoreResult;
    } else {
      throw new Error(notFoundNamedStoreErrorText(storePlaceType.name));
    }
  } else if (storePlaceType.type === 'context') {
    if (storePlaceType.key === storePlaceType.nearestStore.contextKey) {
      return storePlaceType.nearestStore;
    } else {
      if ('parent' in storePlaceType.nearestStore) {
        return getNewValueStore({
          type: storePlaceType.type,
          key: storePlaceType.key,
          nearestStore: storePlaceType.nearestStore.parent,
        });
      } else {
        throw new Error(notFoundContextStoreErrorText(storePlaceType.key));
      }
    }
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore);
  } else {
    return storePlaceType.nearestStore;
  }
}
