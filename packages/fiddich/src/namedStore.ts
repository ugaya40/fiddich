import { AsyncAtom, AsyncAtomFamily, AsyncAtomInstance, changeAsyncAtomValue, changeSyncAtomValue, SyncAtom, SyncAtomFamily, SyncAtomInstance } from './atom';
import {
  AsyncSelector,
  AsyncSelectorFamily,
  AsyncSelectorInstance,
  getOrAddStateInstance,
  SyncSelector,
  SyncSelectorFamily,
  SyncSelectorInstance,
} from './selector';
import type { AsyncAtomOperator, AsyncSelectorOperator, FiddichState, FiddichStore, SyncAtomOperator, SyncSelectorOperator } from './shareTypes';
import { idAndGlobalNamedStoreMap, nameAndGlobalNamedStoreMap } from './util/const';
import { generateRandomKey, getStableValue, getValue } from './util/util';

function createNewNamedStore(name: string): FiddichStore {
  const newStore = { id: generateRandomKey(), map: new Map(), name: name };
  nameAndGlobalNamedStoreMap.set(name, newStore);
  idAndGlobalNamedStoreMap.set(newStore.id, newStore);
  return newStore;
}

export function getOrAddNamedStore(name: string): FiddichStore {
  const existsStore = nameAndGlobalNamedStoreMap.get(name);
  return existsStore != null ? existsStore : createNewNamedStore(name);
}

function getNamedStore(name: string): FiddichStore {
  const store = nameAndGlobalNamedStoreMap.get(name);
  if (store == null) throw new Error(`Store named '${name}' not found.`);
  return store;
}

export function deleteNamedStoreIfExists(name: string): void {
  const store = nameAndGlobalNamedStoreMap.get(name);
  if (store != null) {
    nameAndGlobalNamedStoreMap.delete(name);
    idAndGlobalNamedStoreMap.delete(store.id);
  }
}

class StoreOperator {
  constructor(public store: FiddichStore) {}

  state<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>): SyncAtomOperator<T>;
  state<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>): AsyncAtomOperator<T>;
  state<T>(state: SyncSelector<T> | SyncSelectorFamily<T, any>): SyncSelectorOperator<T>;
  state<T>(state: AsyncSelector<T> | AsyncSelectorFamily<T, any>): AsyncSelectorOperator<T>;
  state<T>(state: FiddichState<T>): SyncAtomOperator<T> | AsyncAtomOperator<T> | SyncSelectorOperator<T> | AsyncSelectorOperator<T>;
  state<T>(state: FiddichState<T>): SyncAtomOperator<T> | AsyncAtomOperator<T> | SyncSelectorOperator<T> | AsyncSelectorOperator<T> {
    const instance = getOrAddStateInstance(state, {
      type: 'normal',
      nearestStore: this.store,
    });
    if (state.type === 'atom' || state.type === 'atomFamily') {
      if ('default' in state) {
        const syncAtomInstance = instance as SyncAtomInstance<T>;
        return {
          state,
          event: syncAtomInstance.event,
          get: () => getStableValue(syncAtomInstance),
          set: arg => changeSyncAtomValue(syncAtomInstance, arg),
        } as SyncAtomOperator<T>;
      } else {
        const asyncAtomInstance = instance as AsyncAtomInstance<T>;
        return {
          state,
          event: asyncAtomInstance.event,
          getAsync: () => getValue(asyncAtomInstance),
          set: arg => changeAsyncAtomValue(asyncAtomInstance, arg),
        } as AsyncAtomOperator<T>;
      }
    } else {
      if ('get' in state) {
        const syncSelectorInstance = instance as SyncSelectorInstance<T>;
        return {
          state,
          event: syncSelectorInstance.event,
          get: () => getStableValue(syncSelectorInstance),
        } as SyncSelectorOperator<T>;
      } else {
        const asyncSelectorInstance = instance as AsyncSelectorInstance<T>;
        return {
          state,
          event: asyncSelectorInstance.event,
          getAsync: () => getValue(asyncSelectorInstance),
        } as AsyncSelectorOperator<T>;
      }
    }
  }
}

export function namedStore(name: string): StoreOperator {
  return new StoreOperator(getOrAddNamedStore(name));
}
