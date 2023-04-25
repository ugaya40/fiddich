import { AsyncAtom, AsyncAtomFamily, AsyncAtomInstance, changeAsyncAtomValue, changeSyncAtomValue, SyncAtom, SyncAtomFamily, SyncAtomInstance } from './atom';
import { AsyncSelector, AsyncSelectorFamily, AsyncSelectorInstance, SyncSelector, SyncSelectorFamily, SyncSelectorInstance } from './selector';
import type { AsyncAtomOperator, AsyncSelectorOperator, FiddichState, FiddichStore, SyncAtomOperator, SyncSelectorOperator } from './shareTypes';
import { idAndGlobalNamedStoreMap, nameAndGlobalNamedStoreMap, notFoundNamedStoreErrorText } from './util/const';
import { eventPublisher } from './util/event';
import { getOrAddStateInstance, getValue } from './util/stateUtil';
import { generateRandomKey } from './util/util';

export function createNewNamedStore(name: string): FiddichStore {
  const newStore: FiddichStore = { id: generateRandomKey(), map: new Map(), name: name, event: eventPublisher(), children: [] };
  nameAndGlobalNamedStoreMap.set(name, newStore);
  idAndGlobalNamedStoreMap.set(newStore.id, newStore);
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
    store.event.emit('destroy');
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
          get: () => getValue(syncAtomInstance) as T,
          set: arg => changeSyncAtomValue(syncAtomInstance, arg),
          instance: syncAtomInstance,
        } as SyncAtomOperator<T>;
      } else {
        const asyncAtomInstance = instance as AsyncAtomInstance<T>;
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
