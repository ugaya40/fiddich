import { AsyncAtom, AsyncAtomFamily, AsyncAtomInstance, AsyncAtomValueArg, SyncAtom, SyncAtomFamily, SyncAtomInstance, SyncAtomValueArg } from './atom';
import { instanceInfoEventEmitter } from '../globalFiddichEvent';
import { StorePlaceType } from '../shareTypes';
import { getFiddichInstance } from '../stateUtil/getInstance';
import { fireFinalizeEffect } from '../stateUtil/instanceOperation';
import { eventPublisher } from '../util/event';
import { getStoreForNewInstance } from '../util/storeUtil';
import { generateRandomKey } from '../util/util';
import { initializeAsyncAtom, initializeSyncAtom } from './initialize';

export const getOrAddAsyncAtomInstance = <T = unknown, TCell = any>(
  atom: AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>,
  storePlaceType: StorePlaceType,
  initialValue?: AsyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as AsyncAtomInstance<T, TCell> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const targetStore = getStoreForNewInstance(storePlaceType);

  const atomInstance: AsyncAtomInstance<T, TCell> = {
    id: generateRandomKey(),
    state: atom,
    cell: atom.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
  };

  instanceInfoEventEmitter.fireInstanceCreated(atomInstance);
  atomInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(atomInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      fireFinalizeEffect(atomInstance);
    }
  });

  initializeAsyncAtom(atomInstance, initialValue);

  targetStore.map.set(atomInstance.state.key, atomInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(atomInstance);
  return atomInstance;
};

export const getOrAddSyncAtomInstance = <T = unknown, TCell = any>(
  atom: SyncAtom<T, TCell> | SyncAtomFamily<T, any, TCell>,
  storePlaceType: StorePlaceType,
  initialValue?: SyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as SyncAtomInstance<T, TCell> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const targetStore = getStoreForNewInstance(storePlaceType);

  const atomInstance: SyncAtomInstance<T, TCell> = {
    id: generateRandomKey(),
    state: atom,
    cell: atom.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
  };

  instanceInfoEventEmitter.fireInstanceCreated(atomInstance);
  atomInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(atomInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      fireFinalizeEffect(atomInstance);
    }
  });

  initializeSyncAtom(atomInstance, initialValue);

  targetStore.map.set(atomInstance.state.key, atomInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(atomInstance);
  return atomInstance;
};
