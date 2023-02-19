import { FiddichStateInstance, globalAtomEffectMap, Store, StateInstanceEvent, StateInstanceStatus, PendingStatus, Compare } from './core';
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

type AtomValueArg<T> = T | Promise<T> | (() => T | Promise<T>);
type AtomFamilyValueArg<T, P> = T | Promise<T> | ((arg: P) => T | Promise<T>);

export type AtomSetterOrUpdaterArg<T> = T | Promise<T> | ((old: T | undefined) => Promise<T> | T);
export type AtomSetterOrUpdater<T> = (setterOrUpdater: AtomSetterOrUpdaterArg<T>) => void;
export type AtomFamilySetterOrUpdaterArg<T, P> = T | Promise<T> | ((old: T | undefined, parameter: P) => Promise<T> | T);
export type AtomFamilySetterOrUpdater<T, P> = (setterOrUpdater: AtomFamilySetterOrUpdaterArg<T, P>) => void;

export type Atom<T = unknown> = {
  type: 'atom';
  key: string;
  default: AtomValueArg<T>;
  compare?: Compare<T>;
};

type AtomArg<T> = {
  key: string;
  default: AtomValueArg<T>;
  effect?: AtomEffect<T>;
  compare?: Compare<T>;
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

export type AtomFamily<T = unknown, P = any> = {
  type: 'atomFamily';
  key: string;
  baseKey: string;
  default: AtomFamilyValueArg<T, P>;
  parameter: P;
  compare?: Compare<T>;
};

type AtomFamilyArg<T, P> = {
  key: string;
  default: AtomFamilyValueArg<T, P>;
  stringfy?: (arg: P) => string;
  effect?: AtomEffect<T>;
  compare?: Compare<T>;
};

type AtomFamilyFunction<T = any, P = any> = (arg: P) => AtomFamily<T, P>;

export const atomFamily = <T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P> => {
  const { key: baseKey, stringfy, effect, ...other } = arg;
  const result: AtomFamilyFunction<T, P> = parameter => {
    const key = `${baseKey}-familyKey-${stringfy != null ? stringfy(parameter) : `${parameter}`}`;
    return {
      ...other,
      parameter,
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

export type AtomInstance<T = unknown> = {
  state: Atom<T> | AtomFamily<T, any>;
  storeId: string;
  status: StateInstanceStatus<T>;
  event: TypedEvent<StateInstanceEvent<T>>;
};

export const getAtomInstanceInternal = <T = unknown>(
  atom: Atom<T> | AtomFamily<T, any>,
  nearestStore: Store,
  ref_storeTree: Store[],
  forceNearest: boolean
): AtomInstance<T> | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(atom.key) as AtomInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if (!forceNearest && 'parent' in nearestStore) return getAtomInstanceInternal(atom, nearestStore.parent, ref_storeTree, forceNearest);
  ref_storeTree.splice(0, ref_storeTree.length);
  return null;
};

export const getAtomInstance = <T = unknown>(
  atom: Atom<T> | AtomFamily<T, any>,
  nearestStore: Store,
  forceNearest: boolean,
  initialValue?: AtomValueArg<T>
): { instance: AtomInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const atomInstanceFromStore = getAtomInstanceInternal(atom, nearestStore, ref_storeTree, forceNearest);

  if (atomInstanceFromStore != null) return { instance: atomInstanceFromStore, storeTree: ref_storeTree };

  const decidedInitialValue = initialValue ?? atom.default;
  const parameter = atom.type === 'atomFamily' ? atom.parameter : undefined;
  const actualInitialValue = typeof decidedInitialValue === 'function' ? (decidedInitialValue as Function)(parameter) : decidedInitialValue;

  const status: StateInstanceStatus<T> =
    actualInitialValue instanceof Promise
      ? {
          type: 'pending',
          promise: actualInitialValue,
          oldValue: undefined,
          abortRequest: false,
        }
      : {
          type: 'stable',
          value: actualInitialValue,
        };

  const newAtomInstance: AtomInstance<T> = {
    event: new TypedEvent<StateInstanceEvent<T>>(),
    storeId: nearestStore.id,
    status,
    state: atom,
  };

  if (status.type === 'pending') {
    new Promise(async resolve => {
      const result = await status.promise!;
      if (!status.abortRequest) {
        newAtomInstance.status = {
          type: 'stable',
          value: result,
        };
      }
      resolve(undefined);
    });
  }

  nearestStore.map.set(newAtomInstance.state.key, newAtomInstance);

  ref_storeTree.push(nearestStore);

  return { instance: newAtomInstance, storeTree: ref_storeTree };
};

const changeAtomValueInternal = <T>(atomInstance: AtomInstance<T>, oldValue: T | undefined, newValue: T, promise?: Promise<T>) => {
  const compareFunction: Compare<T> = atomInstance.state.compare ?? ((o, n) => o === n);
  if (compareFunction(oldValue, newValue)) return;

  const effect = globalAtomEffectMap.get(atomInstance.state.type === 'atomFamily' ? atomInstance.state.baseKey : atomInstance.state.key);

  if (effect?.onBeforeChange != null) {
    const beforeChangeResult = effect.onBeforeChange({ newValue, oldValue, stateInstance: atomInstance });
    if (!beforeChangeResult) return;
  }

  atomInstance.status = {
    type: 'stable',
    value: newValue,
  };

  effect?.onAfterChange?.({ newValue, oldValue, stateInstance: atomInstance });

  atomInstance.event.emit({
    type: 'change',
    oldValue,
    newValue,
    promise,
  });
};

const getNewValue = <T, P>(
  atomInstance: AtomInstance<T>,
  valueOrUpdater: AtomSetterOrUpdaterArg<T> | AtomFamilySetterOrUpdaterArg<T, P>,
  oldValue: T | undefined
) => {
  if (typeof valueOrUpdater === 'function') {
    if (atomInstance.state.type === 'atom') {
      return (valueOrUpdater as (old: T | undefined) => T | Promise<T>)(oldValue);
    } else {
      const atomFamily = atomInstance.state as AtomFamily<T, P>;
      return (valueOrUpdater as (old: T | undefined, parameter: P) => T | Promise<T>)(oldValue, atomFamily.parameter);
    }
  } else {
    return valueOrUpdater;
  }
};

export const changeAtomValue = <T = unknown, P = unknown>(
  atomInstance: AtomInstance<T>,
  valueOrUpdater: AtomSetterOrUpdaterArg<T> | AtomFamilySetterOrUpdaterArg<T, P>
) => {
  if (atomInstance.status.type === 'pending') atomInstance.status.abortRequest = true;

  const oldValue = atomInstance.status.type === 'pending' ? atomInstance.status.oldValue : atomInstance.status.value;
  const newValue = getNewValue(atomInstance, valueOrUpdater, oldValue);

  if (newValue instanceof Promise) {
    atomInstance.status = {
      type: 'pending',
      oldValue,
      abortRequest: false,
      promise: newValue,
    };

    atomInstance.event.emit({
      type: 'pending',
      promise: newValue,
    });

    new Promise(async resolve => {
      const status = atomInstance.status as PendingStatus<T>;
      const newValue = await status.promise!;
      if (!status.abortRequest) {
        changeAtomValueInternal(atomInstance, oldValue, newValue, status.promise);
      }
      resolve(undefined);
    });
  } else {
    changeAtomValueInternal(atomInstance, oldValue, newValue);
  }
};
