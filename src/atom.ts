import { Atom, AtomState, Store } from './core';
import { TypedEvent } from './util/TypedEvent';

export const createIndependentAtomState = <T = unknown>(atom: Atom<T>): AtomState<T> => ({
  atom,
  value: atom.defaultValue,
  event: new TypedEvent(),
  storeId: 'none',
});

export const assignAtomState = (atomState: AtomState, store: Store): void => {
  atomState.storeId = store.id;
  store.map.set(atomState.atom.key, atomState);
};

export const getAtomState = <T = unknown>(atom: Atom<T>, nearestStore: Store): AtomState<T> | null => {
  const nearestStoreResult = nearestStore.map.get(atom.key);
  if (nearestStoreResult != null) return nearestStoreResult;
  if ('parent' in nearestStore) return getAtomState(atom, nearestStore.parent);
  return null;
};
