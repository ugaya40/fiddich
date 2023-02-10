import { FiddichStateInstance, globalAtomEffectMap, Store, StateInstanceEvent } from './core';
import { getDataForSuspense } from './forSuspense';
import { TypedEvent } from './util/TypedEvent';

type ChangeEffectArg<T> = {
  newValue: T;
  oldValue: T;
  stateInstance: FiddichStateInstance<T>;
};

export type AtomEffect<T> = {
  onBeforeChange?: (arg: ChangeEffectArg<T>) => boolean;
  onAfterChange?: (arg: ChangeEffectArg<T>) => void;
};

export type Atom<T = any> = {
  type: 'atom';
  key: string;
  default: T | Promise<T>;
};

type AtomArg<T> = {
  key: string;
  default: T | Promise<T>;
  effect?: AtomEffect<T>;
};

export const atom = <T>(arg: AtomArg<T>): Atom<T> => {
  const { effect, ...other } = arg;
  const result: Atom<T> = {
    ...other,
    type: 'atom',
  };

  if (effect != null) {
    globalAtomEffectMap.set(result.key, effect);
  }

  return result;
};

export type AtomFamily<T = any> = {
  type: 'atomFamily';
  key: string;
  baseKey: string;
  default: T | Promise<T>;
};

type AtomFamilyArg<T, P> = {
  key: string;
  default: T;
  stringfy?: (arg: P) => string;
  effect?: AtomEffect<T>;
};

type AtomFamilyFunction<T = any, Parameter = any> = (arg: Parameter) => AtomFamily<T>;

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
    globalAtomEffectMap.set(baseKey, effect);
  }

  return result;
};

export type AtomInstance<T = any> = {
  state: Atom<T> | AtomFamily<T>;
  storeId: string;
  value: T;
  event: TypedEvent<StateInstanceEvent<T>>;
};

export const getAtomInstanceInternal = <T = unknown>(atom: Atom<T> | AtomFamily<T>, nearestStore: Store, ref_storeTree: Store[]): AtomInstance<T> | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(atom.key) as AtomInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if ('parent' in nearestStore) return getAtomInstanceInternal(atom, nearestStore.parent, ref_storeTree);
  ref_storeTree.splice(0, ref_storeTree.length);
  return null;
};

export const getAtomInstance = <T = unknown>(
  atom: Atom<T> | AtomFamily<T>,
  nearestStore: Store,
  initialValue?: T | Promise<T>
): { instance: AtomInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const atomInstanceFromStore = getAtomInstanceInternal<T>(atom, nearestStore, ref_storeTree);

  if (atomInstanceFromStore != null) return { instance: atomInstanceFromStore, storeTree: ref_storeTree };

  const defaultValueResult = getDataForSuspense(nearestStore, atom.key, initialValue ?? atom.default);
  if ('promise' in defaultValueResult) {
    throw defaultValueResult.promise;
  } else if ('error' in defaultValueResult) {
    throw defaultValueResult.error;
  }

  const newAtomInstance: AtomInstance<T> = {
    state: atom,
    value: defaultValueResult.data,
    event: new TypedEvent(),
    storeId: nearestStore.id,
  };

  nearestStore.map.set(newAtomInstance.state.key, newAtomInstance);
  ref_storeTree.push(nearestStore);

  return { instance: newAtomInstance, storeTree: ref_storeTree };
};

export const changeAtomValue = <T = unknown>(atomInstance: AtomInstance<T>, valueOrUpdater: ((old: T) => T) | T) => {
  const oldValue = atomInstance.value;
  const newValue = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (old: T) => T)(oldValue) : valueOrUpdater;

  if (oldValue === newValue) return;

  const effect = globalAtomEffectMap.get(atomInstance.state.type === 'atomFamily' ? atomInstance.state.baseKey : atomInstance.state.key);

  if (effect?.onBeforeChange != null) {
    const beforeChangeResult = effect.onBeforeChange({ newValue, oldValue, stateInstance: atomInstance });
    if (!beforeChangeResult) return;
  }

  atomInstance.value = newValue;

  effect?.onAfterChange?.({ newValue, oldValue, stateInstance: atomInstance });

  atomInstance.event.emitAsync({
    type: 'change',
    oldValue,
    newValue,
  });
};
