import type { Compare, FiddichState, FiddichStateInstance, FiddichStore, Store, StorePlaceType } from '../shareTypes';
import { idAndGlobalNamedStoreMap, invalidStatusErrorText, nameAndGlobalNamedStoreMap } from './const';

export const defaultCompareFunction: Compare = <T>(oldValue: T | undefined, newValue: T) => oldValue === newValue;

export function getRootStore(store: Store): Store {
  if ('parent' in store) {
    return getRootStore(store.parent);
  } else {
    return store;
  }
}

export const getStableValue = <T>(instance: FiddichStateInstance<T>) => {
  const status = instance.status;
  if (status.type === 'error' || status.type === 'unknown' || status.type === 'waiting for initialize') return undefined;
  return status.type === 'stable' ? status.value : status.oldValue;
};

export function getStoreByStorePlace(storePlaceType: StorePlaceType) {
  if (storePlaceType.type === 'named') {
    return nameAndGlobalNamedStoreMap.get(storePlaceType.name)!;
  }

  if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore);
  }

  return storePlaceType.nearestStore;
}

export function getFiddichInstance<T = unknown>(atom: FiddichState<T>, storePlaceType: StorePlaceType): FiddichStateInstance<T> | undefined {
  if (storePlaceType.type === 'named') {
    const store = nameAndGlobalNamedStoreMap.get(storePlaceType.name)!;
    return store.map.get(atom.key);
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore).map.get(atom.key);
  } else {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(atom.key);

    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }

    if (storePlaceType.type === 'hierarchical') {
      if ('parent' in storePlaceType.nearestStore) {
        return getFiddichInstance(atom, {
          type: storePlaceType.type,
          nearestStore: storePlaceType.nearestStore.parent,
        });
      }
    }
  }

  return undefined;
}

export function getValue<T>(instance: FiddichStateInstance<T>): T | Promise<T> {
  const status = instance.status;
  if (status.type === 'stable') {
    return status.value;
  } else if ('abortRequest' in status) {
    return new Promise<T>(async (resolve, reject) => {
      await status.promise;
      const newStatus = instance.status;
      if (newStatus.type === 'stable') {
        resolve(newStatus.value);
      } else if (newStatus.type === 'error') {
        reject(newStatus.error);
      } else {
        resolve(getValue(instance));
      }
    });
  } else if (status.type === 'error') {
    throw status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  window.crypto.getRandomValues(array);
  const hexArray = Array.from(array, byte => {
    return ('0' + byte.toString(16)).slice(-2);
  });
  const hexString = hexArray.join('');
  const truncatedHexString = hexString.slice(0, length);
  return truncatedHexString;
}

export const generateRandomKey = () => generateRandomString(8);

export class StateInstanceError extends Error {
  state: FiddichState<any>;

  constructor(public instance: FiddichStateInstance<any>, public originalError: Error) {
    super();
    this.name = 'StateInstanceError';
    this.state = instance.state;
    const namedStore = idAndGlobalNamedStoreMap.get(instance.storeId);
    this.message = `${namedStore != null ? `StoreName: "${namedStore.name!}"` : `StoreId: "${instance.storeId}"`} StateKey: "${instance.state.key}"`;
    this.stack = `${this.stack}
     ------ Original Error ------
     ${this.originalError.stack}`;
  }
}
