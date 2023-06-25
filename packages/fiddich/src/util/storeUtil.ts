import { Store, StorePlaceType } from '../shareTypes';
import { nameAndGlobalNamedStoreMap, notFoundNamedStoreErrorText } from './const';

export function getRootStore(store: Store): Store {
  if ('parent' in store) {
    return getRootStore(store.parent);
  } else {
    return store;
  }
}

export function getStoreForNewInstance(storePlaceType: StorePlaceType): Store {
  if (storePlaceType.type === 'named') {
    const namedStoreResult = nameAndGlobalNamedStoreMap.get(storePlaceType.name)!;
    if (namedStoreResult != null) {
      return namedStoreResult;
    } else {
      throw new Error(notFoundNamedStoreErrorText(storePlaceType.name));
    }
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore);
  } else {
    return storePlaceType.nearestStore;
  }
}
