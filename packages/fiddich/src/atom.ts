import {
  FiddichStateInstance,
  globalAtomEffectMap,
  PendingStatus,
  Compare,
  PendingEvent,
  ChangedEvent,
  ChangedByPromiseEvent,
  StableStatus,
  StorePlaceType,
  UninitializedStatus,
  getOldValue,
} from './share';
import { EventPublisher, eventPublisher } from './event';
import { getNamedStore, getRootStore } from './util';

type ChangeEffectArg<T> = {
  newValue: T;
  oldValue: T | undefined;
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
  status: UninitializedStatus<T> | StableStatus<T> | PendingStatus<T>;
  event: EventPublisher<PendingEvent<T> | ChangedEvent<T> | ChangedByPromiseEvent<T>>;
};

const getAtomInstanceInternal = <T = unknown>(atom: Atom<T> | AtomFamily<T, any>, storePlaceType: StorePlaceType): AtomInstance<T> | undefined => {
  if (storePlaceType.type === 'named') {
    const store = getNamedStore(storePlaceType.name);
    return store.map.get(atom.key) as AtomInstance<T> | undefined;
  } else if (storePlaceType.type === 'nearest') {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(atom.key) as AtomInstance<T> | undefined;
    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }
  } else if (storePlaceType.type === 'normal') {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(atom.key) as AtomInstance<T> | undefined;
    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }
    if ('parent' in storePlaceType.nearestStore) {
      return getAtomInstanceInternal(atom, {
        type: storePlaceType.type,
        nearestStore: storePlaceType.nearestStore.parent,
      });
    }
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore).map.get(atom.key) as AtomInstance<T> | undefined;
  }

  return undefined;
};

export const getAtomInstance = <T = unknown>(atom: Atom<T> | AtomFamily<T, any>, storePlaceType: StorePlaceType, initialValue?: AtomValueArg<T>): AtomInstance<T> => {
  const atomInstanceFromStore = getAtomInstanceInternal(atom, storePlaceType);

  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const decidedInitialValue = initialValue ?? atom.default;
  const parameter = atom.type === 'atomFamily' ? atom.parameter : undefined;
  const actualInitialValue = typeof decidedInitialValue === 'function' ? (decidedInitialValue as Function)(parameter) : decidedInitialValue;
  const targetStore =
    storePlaceType.type === 'named' ? getNamedStore(storePlaceType.name) : storePlaceType.type === 'root' ? getRootStore(storePlaceType.nearestStore) : storePlaceType.nearestStore;

  const status: UninitializedStatus<T> | StableStatus<T> =
    actualInitialValue instanceof Promise
      ? {
          type: 'uninitialized',
          promise: actualInitialValue,
          abortRequest: false,
        }
      : {
          type: 'stable',
          value: actualInitialValue,
        };

  const newAtomInstance: AtomInstance<T> = {
    state: atom,
    event: eventPublisher(),
    storeId: targetStore.id,
    status,
  };

  if (status.type === 'uninitialized') {
    new Promise<void>(async resolve => {
      const result = await status.promise!;
      if (!status.abortRequest) {
        newAtomInstance.status = {
          type: 'stable',
          value: result,
        };
      }
      resolve();
    });
  }

  targetStore.map.set(newAtomInstance.state.key, newAtomInstance);
  return newAtomInstance;
};

const changeAtomValueInternal = <T>(atomInstance: AtomInstance<T>, oldValue: T | undefined, newValue: T, promise?: Promise<T>) => {
  const compareFunction: Compare<T> = atomInstance.state.compare ?? ((o, n) => o === n);
  if (compareFunction(oldValue, newValue)) return;

  const effect = globalAtomEffectMap.get(atomInstance.state.type === 'atomFamily' ? atomInstance.state.baseKey : atomInstance.state.key) as AtomEffect<T>;

  if (effect?.onBeforeChange != null) {
    const beforeChangeResult = effect.onBeforeChange({ newValue, oldValue, stateInstance: atomInstance });
    if (!beforeChangeResult) return;
  }

  atomInstance.status = {
    type: 'stable',
    value: newValue,
  };

  effect?.onAfterChange?.({ newValue, oldValue, stateInstance: atomInstance });

  atomInstance.event.emit(
    promise != null
      ? {
          type: 'change by promise',
          newValue,
          oldValue,
          promise,
        }
      : {
          type: 'change',
          newValue,
          oldValue,
        }
  );
};

const getNewValue = <T, P>(atomInstance: AtomInstance<T>, valueOrUpdater: AtomSetterOrUpdaterArg<T> | AtomFamilySetterOrUpdaterArg<T, P>, oldValue: T | undefined) => {
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

export const changeAtomValue = <T = unknown, P = unknown>(atomInstance: AtomInstance<T>, valueOrUpdater: AtomSetterOrUpdaterArg<T> | AtomFamilySetterOrUpdaterArg<T, P>) => {
  if (atomInstance.status.type === 'pending') atomInstance.status.abortRequest = true;

  const oldValue = getOldValue(atomInstance);
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

    new Promise<void>(async resolve => {
      const status = atomInstance.status as PendingStatus<T>;
      const newValue = await status.promise;
      if (!status.abortRequest) {
        changeAtomValueInternal(atomInstance, oldValue, newValue, status.promise);
      }
      resolve();
    });
  } else {
    changeAtomValueInternal(atomInstance, oldValue, newValue);
  }
};
