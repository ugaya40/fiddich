import { getOrAddAsyncAtomInstance, getOrAddSyncAtomInstance } from '../atom/getOrAddInstance';
import { getNamedStore } from '../namedStore';
import { getOrAddAsyncSelectorInstance, getOrAddSyncSelectorInstance } from '../selector/getOrAddInstance';
import { FiddichState, FiddichStateInstance, StorePlaceType } from '../shareTypes';
import { getRootStore } from '../util/storeUtil';

export function getFiddichInstance<T = unknown, TCell = any>(
  state: FiddichState<T, TCell>,
  storePlaceType: StorePlaceType
): FiddichStateInstance<T, TCell> | undefined {
  if (storePlaceType.type === 'named') {
    const store = getNamedStore(storePlaceType.name);
    return store.map.get(state.key);
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore).map.get(state.key);
  } else {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(state.key);

    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }

    if (storePlaceType.type === 'hierarchical') {
      if ('parent' in storePlaceType.nearestStore) {
        return getFiddichInstance(state, {
          type: storePlaceType.type,
          nearestStore: storePlaceType.nearestStore.parent,
        });
      }
    }
  }

  return undefined;
}

export const getOrAddStateInstance = <T = unknown, TCell = any>(
  state: FiddichState<T, TCell>,
  storePlaceType: StorePlaceType
): FiddichStateInstance<T, TCell> => {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    if ('default' in state) {
      return getOrAddSyncAtomInstance(state, storePlaceType);
    } else {
      return getOrAddAsyncAtomInstance(state, storePlaceType);
    }
  } else {
    if ('get' in state) {
      return getOrAddSyncSelectorInstance(state, storePlaceType);
    } else {
      return getOrAddAsyncSelectorInstance(state, storePlaceType);
    }
  }
};
