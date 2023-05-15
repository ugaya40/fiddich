import { AsyncAtom, AsyncAtomFamily, AsyncAtomInstance, changeAsyncAtomValue, changeSyncAtomValue, SyncAtom, SyncAtomFamily, SyncAtomInstance } from './atom';
import { AsyncSelector, AsyncSelectorFamily, AsyncSelectorInstance, SyncSelector, SyncSelectorFamily, SyncSelectorInstance } from './selector';
import type { AsyncAtomOperator, AsyncSelectorOperator, FiddichState, FiddichStore, SyncAtomOperator, SyncSelectorOperator } from './shareTypes';
import { idAndGlobalNamedStoreMap, nameAndGlobalNamedStoreMap, notFoundNamedStoreErrorText } from './util/const';
import { eventPublisher } from './util/event';
import { storeInfoEventEmitter } from './globalFiddichEvent';
import { getOrAddStateInstance, getValue } from './util/stateUtil';
import { generateRandomKey } from './util/util';

export function createNewNamedStore(name: string): FiddichStore {
  const newStore: FiddichStore = { id: generateRandomKey(), map: new Map(), name, event: eventPublisher(), children: [] };
  nameAndGlobalNamedStoreMap.set(name, newStore);
  idAndGlobalNamedStoreMap.set(newStore.id, newStore);
  storeInfoEventEmitter.fireStoreCreated(newStore);
  return newStore;
}

export function getOrAddNamedStore(name: string): FiddichStore {
  const existsStore = nameAndGlobalNamedStoreMap.get(name);
  return existsStore != null ? existsStore : createNewNamedStore(name);
}

export function getNamedStore(name: string): FiddichStore {
  const store = nameAndGlobalNamedStoreMap.get(name);
  if (store == null) throw new Error(notFoundNamedStoreErrorText(name));
  return store;
}

export function deleteNamedStoreIfExists(name: string): void {
  const store = nameAndGlobalNamedStoreMap.get(name);
  if (store != null) {
    nameAndGlobalNamedStoreMap.delete(name);
    idAndGlobalNamedStoreMap.delete(store.id);
    store.event.emit('finalize');
    storeInfoEventEmitter.fireStoreDestroyed(store);
  }
}

class StoreOperator {
  constructor(public store: FiddichStore) {}

  state<T, TCell>(state: SyncAtom<T, TCell> | SyncAtomFamily<T, any, TCell>): SyncAtomOperator<T>;
  state<T, TCell>(state: AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>): AsyncAtomOperator<T>;
  state<T, TCell>(state: SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>): SyncSelectorOperator<T>;
  state<T, TCell>(state: AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>): AsyncSelectorOperator<T>;
  state<T, TCell>(state: FiddichState<T, TCell>): SyncAtomOperator<T> | AsyncAtomOperator<T> | SyncSelectorOperator<T> | AsyncSelectorOperator<T>;
  state<T, TCell>(state: FiddichState<T, TCell>): SyncAtomOperator<T> | AsyncAtomOperator<T> | SyncSelectorOperator<T> | AsyncSelectorOperator<T> {
    const instance = getOrAddStateInstance(state, {
      type: 'normal',
      nearestStore: this.store,
    });
    if (state.type === 'atom' || state.type === 'atomFamily') {
      if ('default' in state) {
        const syncAtomInstance = instance as SyncAtomInstance<T, TCell>;
        return {
          state,
          event: syncAtomInstance.event,
          get: () => getValue(syncAtomInstance) as T,
          set: arg => changeSyncAtomValue(syncAtomInstance, arg),
          instance: syncAtomInstance,
        } as SyncAtomOperator<T>;
      } else {
        const asyncAtomInstance = instance as AsyncAtomInstance<T, TCell>;
        return {
          state,
          event: asyncAtomInstance.event,
          getAsync: () => getValue(asyncAtomInstance),
          set: arg => changeAsyncAtomValue(asyncAtomInstance, arg),
          instance: asyncAtomInstance,
        } as AsyncAtomOperator<T>;
      }
    } else {
      if ('get' in state) {
        const syncSelectorInstance = instance as SyncSelectorInstance<T>;
        return {
          state,
          event: syncSelectorInstance.event,
          get: () => getValue(syncSelectorInstance) as T,
          instance: syncSelectorInstance,
        } as SyncSelectorOperator<T>;
      } else {
        const asyncSelectorInstance = instance as AsyncSelectorInstance<T>;
        return {
          state,
          event: asyncSelectorInstance.event,
          getAsync: () => getValue(asyncSelectorInstance),
          instance: asyncSelectorInstance,
        } as AsyncSelectorOperator<T>;
      }
    }
  }
}

export function namedStore(name: string): StoreOperator {
  return new StoreOperator(getOrAddNamedStore(name));
}
