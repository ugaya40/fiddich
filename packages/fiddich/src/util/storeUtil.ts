import { getNamedStore } from '../namedStore';
import { Store, StorePlaceType } from '../shareTypes';

export function getRootStore(store: Store): Store {
  if ('parent' in store) {
    return getRootStore(store.parent);
  } else {
    return store;
  }
}

export function getStoreForNewInstance(storePlaceType: StorePlaceType): Store {
  if (storePlaceType.type === 'named') {
    return getNamedStore(storePlaceType.name);
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore);
  } else {
    return storePlaceType.nearestStore;
  }
}
