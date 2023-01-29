import { Atom, AtomFamilyFunction, Atoms, AtomState, AtomStateChangedEvent, AtomsEffect, globalEffectMap, Store } from './core';
import { TypedEvent } from './util/TypedEvent';

type AtomArg<T> = {
  key: string;
  default: T;
  effect?: AtomsEffect<T>;
};

export const atom = <T>(arg: AtomArg<T>): Atom<T> => {
  const { effect, ...other } = arg;
  const result: Atom<T> = {
    ...other,
    type: 'atom',
  };

  if (effect != null) {
    globalEffectMap.set(result.key, effect);
  }

  return result;
};

type AtomFamilyArg<T, P> = {
  key: string;
  default: T;
  stringfy?: (arg: P) => string;
  effect?: AtomsEffect<T>;
};

export const atomFamily = <T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P> => {
  const { key: baseKey, stringfy, effect, ...other } = arg;
  const result: AtomFamilyFunction<T, P> = para => {
    const key = `${baseKey}-familyKey-${stringfy != null ? stringfy(para) : `${para}`}`;
    return {
      ...other,
      key,
      baseKey,
      type: 'atomFamily',
    };
  };

  if (effect != null) {
    globalEffectMap.set(baseKey, effect);
  }

  return result;
};

export const createIndependentAtomState = <T = unknown>(atom: Atoms<T>, initialValue?: T): AtomState<T> => {
  const newState: AtomState<T> = {
    atom,
    value: initialValue ?? atom.default,
    event: new TypedEvent(),
    storeId: 'none',
  };
  return newState;
};

export const assignAtomState = (atomState: AtomState, store: Store): void => {
  atomState.storeId = store.id;
  store.map.set(atomState.atom.key, atomState);
};

export const getAtomState = <T = unknown>(atom: Atoms<T>, nearestStore: Store): AtomState<T> | null => {
  const nearestStoreResult = nearestStore.map.get(atom.key);
  if (nearestStoreResult != null) return nearestStoreResult;
  if ('parent' in nearestStore) return getAtomState(atom, nearestStore.parent);
  return null;
};

export const changeValue = <T = unknown>(atomState: AtomState<T>, valueOrUpdater: ((old: T) => T) | T) => {
  const oldValue = atomState.value;
  const newValue = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (old: T) => T)(oldValue) : valueOrUpdater;

  if (oldValue === newValue) return;

  const effect = globalEffectMap.get(atomState.atom.type === 'atomFamily' ? atomState.atom.baseKey : atomState.atom.key);

  if (effect?.onBeforeChange != null) {
    const beforeChangeResult = effect.onBeforeChange({ newValue, oldValue, atomState });
    if (!beforeChangeResult) return;
  }

  atomState.value = newValue;

  effect?.onAfterChange?.({ newValue, oldValue, atomState });

  atomState.event.emitAsync({
    type: 'change',
    oldValue,
    newValue,
  });
};
