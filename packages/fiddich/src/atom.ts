import { Atom, AtomState, AtomStateChangedEvent, AtomStateEffect, Store } from './core';
import { TypedEvent } from './util/TypedEvent';

export const atom = <T>(arg: { key: string; default: T; defaultEffect?: AtomStateEffect<T> }): Atom<T> => arg;

export const createIndependentAtomState = <T = unknown>(atom: Atom<T>, initialValue?: T, effect?: AtomStateEffect<T>): AtomState<T> => {
  const newState: AtomState<T> = {
    atom,
    value: initialValue ?? atom.default,
    event: new TypedEvent(),
    storeId: 'none',
    effect: { ...atom.defaultEffect, ...effect },
  };
  return newState;
};

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

export const changeValue = <T = unknown>(atomState: AtomState<T>, valueOrUpdater: ((old: T) => T) | T) => {
  const oldValue = atomState.value;
  const newValue = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (old: T) => T)(oldValue) : valueOrUpdater;

  if (oldValue === newValue) return;

  if (atomState.effect?.onBeforeChange != null) {
    const beforeChangeResult = atomState.effect.onBeforeChange(newValue, oldValue, atomState);
    if (!beforeChangeResult) return;
  }

  atomState.value = newValue;

  atomState.effect?.onAfterChange?.(newValue, oldValue, atomState);

  atomState.event.emitAsync({
    type: 'change',
    oldValue,
    newValue,
  });
};
