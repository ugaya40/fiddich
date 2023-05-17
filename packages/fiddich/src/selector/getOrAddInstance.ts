import { instanceInfoEventEmitter } from '../globalFiddichEvent';
import { FiddichStateInstance, StorePlaceType } from '../shareTypes';
import { getFiddichInstance } from '../stateUtil/getInstance';
import { fireFinalizeEffect } from '../stateUtil/instanceOperation';
import { Disposable, eventPublisher } from '../util/event';
import { getStoreForNewInstance } from '../util/storeUtil';
import { generateRandomKey } from '../util/util';
import { initializeAsyncSelector, initializeSyncSelector } from './initialize';
import { AsyncSelector, AsyncSelectorFamily, AsyncSelectorInstance, SyncSelector, SyncSelectorFamily, SyncSelectorInstance } from './selector';

export const getOrAddSyncSelectorInstance = <T, TCell>(
  selector: SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>,
  storePlaceType: StorePlaceType
): SyncSelectorInstance<T, TCell> => {
  const selectorInstanceFromStore = getFiddichInstance<T, TCell>(selector, storePlaceType) as SyncSelectorInstance<T, TCell> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getStoreForNewInstance(storePlaceType);

  const selectorInstance: SyncSelectorInstance<T, TCell> = {
    id: generateRandomKey(),
    state: selector,
    cell: selector.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  instanceInfoEventEmitter.fireInstanceCreated(selectorInstance);
  selectorInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(selectorInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      fireFinalizeEffect(selectorInstance);
    }
  });

  initializeSyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(selectorInstance);
  return selectorInstance;
};

export const getOrAddAsyncSelectorInstance = <T, TCell>(
  selector: AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>,
  storePlaceType: StorePlaceType
): AsyncSelectorInstance<T, TCell> => {
  const selectorInstanceFromStore = getFiddichInstance(selector, storePlaceType) as AsyncSelectorInstance<T, TCell> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getStoreForNewInstance(storePlaceType);

  const selectorInstance: AsyncSelectorInstance<T, TCell> = {
    id: generateRandomKey(),
    state: selector,
    cell: selector.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  instanceInfoEventEmitter.fireInstanceCreated(selectorInstance);
  selectorInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(selectorInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      fireFinalizeEffect(selectorInstance);
    }
  });

  initializeAsyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(selectorInstance);
  return selectorInstance;
};
