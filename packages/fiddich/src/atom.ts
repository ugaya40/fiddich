import type {
  WaitingStatus,
  Compare,
  WaitingEventArg,
  ChangedEventArg,
  ChangedByPromiseEventArg,
  StableStatus,
  StorePlaceType,
  WaitingForInitializeStatus,
  ErrorStatus,
  ErrorEventArg,
  UnknownStatus,
  InitializedEventArg,
  Store,
  ResetEventArg,
} from './shareTypes';
import { defaultCompareFunction } from './util/const';
import { EventPublisher, eventPublisher } from './util/event';
import { atomInstanceInfoEventEmitter, instanceInfoEventEmitter } from './globalFiddichEvent';
import { EffectsType, NotFunction, StateInstanceError, StrictUnion, effectsArgBase, getFiddichInstance, getStableValue } from './util/stateUtil';
import { getNewValueStore } from './util/storeUtil';
import { generateRandomKey } from './util/util';

export type SyncAtomValueArg<T> = Awaited<NotFunction<T>> | (() => Awaited<T>);
export type AsyncAtomValueArg<T> = Promise<NotFunction<T>> | Awaited<NotFunction<T>> | (() => Promise<T> | Awaited<T>);

export type SyncAtomSetterOrUpdaterArg<T> = T | ((old: T | undefined) => T);
export type AsyncAtomSetterOrUpdaterArg<T> = T | Promise<T> | ((old: T | undefined) => T | Promise<T>);
export type AtomSetterOrUpdaterArg<T> = SyncAtomSetterOrUpdaterArg<T> | AsyncAtomSetterOrUpdaterArg<T>;

export type SyncAtomSetterOrUpdater<T> = (setterOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => void;
export type AsyncAtomSetterOrUpdater<T> = (setterOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => void;
export type AtomSetterOrUpdater<T> = SyncAtomSetterOrUpdater<T> | AsyncAtomSetterOrUpdater<T>;

type AtomBase<T> = {
  type: 'atom';
  key: string;
  name?: string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

export type SyncAtom<T> = AtomBase<T> & {
  default: SyncAtomValueArg<T>;
};

export type AsyncAtom<T> = AtomBase<T> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

export type Atom<T = any> = SyncAtom<T> | AsyncAtom<T>;

type AtomArgBase<T> = {
  name?: string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

type SyncAtomArg<T> = AtomArgBase<T> & {
  default: SyncAtomValueArg<T>;
};
type AsyncAtomArg<T> = AtomArgBase<T> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

type AtomArg<T> = StrictUnion<SyncAtomArg<T> | AsyncAtomArg<T>>;

export function atom<T>(arg: SyncAtomArg<T>): SyncAtom<T>;
export function atom<T>(arg: AsyncAtomArg<T>): AsyncAtom<T>;
export function atom<T>(arg: AtomArg<T>): Atom<T>;
export function atom<T>(arg: AtomArg<T>): Atom<T> {
  const result: Atom<T> = {
    key: generateRandomKey(),
    ...arg,
    type: 'atom',
  };

  return result;
}

type SyncAtomFamilyValueArg<T, P> = Awaited<T> | ((arg: P) => Awaited<T>);
type AsyncAtomFamilyValueArg<T, P> = Promise<T> | Awaited<T> | ((arg: P) => Promise<T> | Awaited<T>);

type AtomFamilyBase<T = any, P = any> = {
  type: 'atomFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

export type SyncAtomFamily<T, P> = AtomFamilyBase<T, P> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamily<T, P> = AtomFamilyBase<T, P> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamily<T = unknown, P = any> = SyncAtomFamily<T, P> | AsyncAtomFamily<T, P>;

type AtomFamilyArgBase<T, P> = {
  name?: string;
  stringfy?: (arg: P) => string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

type SyncAtomFamilyArg<T, P> = AtomFamilyArgBase<T, P> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

type AsyncAtomFamilyArg<T, P> = AtomFamilyArgBase<T, P> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

type AtomFamilyArg<T, P> = SyncAtomFamilyArg<T, P> | AsyncAtomFamilyArg<T, P>;

export type SyncAtomFamilyFunction<T = unknown, P = unknown> = (arg: P) => SyncAtomFamily<T, P>;
export type AsyncAtomFamilyFunction<T = unknown, P = unknown> = (arg: P) => AsyncAtomFamily<T, P>;
export type AtomFamilyFunction<T = any, P = any> = (arg: P) => AtomFamily<T, P>;

export function atomFamily<T, P>(arg: SyncAtomFamilyArg<T, P>): SyncAtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AsyncAtomFamilyArg<T, P>): AsyncAtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P> {
  const baseKey = generateRandomKey();
  const { stringfy, ...other } = arg;
  const result: AtomFamilyFunction<T, P> = parameter => {
    const key = `${baseKey}-familyKey-${stringfy != null ? stringfy(parameter) : `${JSON.stringify(parameter)}`}`;
    return {
      ...other,
      parameter,
      key,
      baseKey,
      type: 'atomFamily',
    };
  };

  return result;
}

type SyncAtomInstanceStatus<T> = UnknownStatus | StableStatus<T> | ErrorStatus;
type AsyncAtomInstanceStatus<T> = UnknownStatus | WaitingForInitializeStatus | StableStatus<T> | WaitingStatus<T> | ErrorStatus;

export type SyncAtomInstanceEvent<T> = InitializedEventArg<T> | ChangedEventArg<T> | ErrorEventArg | ResetEventArg;
export type AsyncAtomInstanceEvent<T> = InitializedEventArg<T> | WaitingEventArg | ChangedByPromiseEventArg<T> | ErrorEventArg | ResetEventArg;

export type SyncAtomInstance<T = unknown> = {
  id: string;
  state: SyncAtom<T> | SyncAtomFamily<T, any>;
  store: Store;
  status: SyncAtomInstanceStatus<T>;
  event: EventPublisher<SyncAtomInstanceEvent<T>>;
};

export type AsyncAtomInstance<T = unknown> = {
  id: string;
  state: AsyncAtom<T> | AsyncAtomFamily<T, any>;
  store: Store;
  status: AsyncAtomInstanceStatus<T>;
  event: EventPublisher<AsyncAtomInstanceEvent<T>>;
};

export type AtomInstance<T> = SyncAtomInstance<T> | AsyncAtomInstance<T>;

const getNewValueFromSyncAtom = <T>(valueOrUpdater: SyncAtomSetterOrUpdaterArg<T>, oldValue: T | undefined): T => {
  if (valueOrUpdater instanceof Function) {
    return valueOrUpdater(oldValue);
  } else {
    return valueOrUpdater;
  }
};

const getNewValueFromAsyncAtom = <T>(valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>, oldValue: T | undefined): T | Promise<T> => {
  if (valueOrUpdater instanceof Function) {
    return valueOrUpdater(oldValue);
  } else {
    return valueOrUpdater;
  }
};

const initializeAsyncAtom = <T>(atomInstance: AsyncAtomInstance<T>, initialValue?: AsyncAtomValueArg<T> | AsyncAtomFamilyValueArg<T, any>) => {
  const asyncAtom = atomInstance.state as AsyncAtom<T> | AsyncAtomFamily<T, any>;
  const parameter = asyncAtom.type === 'atomFamily' ? asyncAtom.parameter : undefined;

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const initializePromise = new Promise<void>(async resolve => {
    try {
      const decidedInitialValue = initialValue ?? asyncAtom.asyncDefault;
      const initialValuePromise = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;
      const actualInitialValue = await initialValuePromise;
      if (!waitingForInitializeStatus!.abortRequest) {
        atomInstance.status = {
          type: 'stable',
          value: actualInitialValue,
        };

        if (atomInstance.state.effects?.init != null) {
          atomInstance.state.effects.init({
            ...effectsArgBase(atomInstance.store),
            value: actualInitialValue,
          });
        }

        atomInstance.event.emit({
          type: 'initialized',
          value: actualInitialValue,
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(atomInstance, e);
        const errorInfo = { type: 'error', error } as const;
        atomInstance.status = errorInfo;
        atomInstance.event.emit(errorInfo);

        if (atomInstance.state.effects?.error != null) {
          atomInstance.state.effects.error({
            ...effectsArgBase(atomInstance.store),
            error,
            oldValue: undefined,
          });
        }
      } else {
        throw e;
      }
    }
    resolve();
  });

  waitingForInitializeStatus = {
    type: 'waiting for initialize',
    abortRequest: false,
    promise: initializePromise,
  };

  atomInstance.status = waitingForInitializeStatus;
};

const initializeSyncAtom = <T>(atomInstance: SyncAtomInstance<T>, initialValue?: SyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any>) => {
  const syncAtom = atomInstance.state as SyncAtom<T> | SyncAtomFamily<T, any>;
  const parameter = syncAtom.type === 'atomFamily' ? syncAtom.parameter : undefined;

  try {
    const decidedInitialValue = initialValue ?? syncAtom.default;
    const actualInitialValue = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;

    atomInstance.status = {
      type: 'stable',
      value: actualInitialValue,
    };

    if (atomInstance.state.effects?.init != null) {
      atomInstance.state.effects.init({
        ...effectsArgBase(atomInstance.store),
        value: actualInitialValue,
      });
    }

    atomInstance.event.emit({ type: 'initialized', value: actualInitialValue });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      atomInstance.event.emit(errorInfo);

      if (atomInstance.state.effects?.error != null) {
        atomInstance.state.effects.error({
          ...effectsArgBase(atomInstance.store),
          error,
          oldValue: undefined,
        });
      }
    } else {
      throw e;
    }
  }
};

export const getOrAddAsyncAtomInstance = <T = unknown>(
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  storePlaceType: StorePlaceType,
  initialValue?: AsyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as AsyncAtomInstance<T> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const atomInstance: AsyncAtomInstance<T> = {
    id: generateRandomKey(),
    state: atom,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
  };

  instanceInfoEventEmitter.fireInstanceCreated(atomInstance);
  atomInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(atomInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'destroy') {
      if (atomInstance.state.effects?.destroy != null) {
        atomInstance.state.effects.destroy({
          ...effectsArgBase(atomInstance.store),
          lastValue: getStableValue(atomInstance),
        });
      }
    }
  });

  initializeAsyncAtom(atomInstance, initialValue);

  targetStore.map.set(atomInstance.state.key, atomInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(atomInstance);
  return atomInstance;
};

export const getOrAddSyncAtomInstance = <T = unknown>(
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  storePlaceType: StorePlaceType,
  initialValue?: SyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as SyncAtomInstance<T> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const atomInstance: SyncAtomInstance<T> = {
    id: generateRandomKey(),
    state: atom,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
  };

  instanceInfoEventEmitter.fireInstanceCreated(atomInstance);
  atomInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(atomInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'destroy') {
      if (atomInstance.state.effects?.destroy != null) {
        atomInstance.state.effects.destroy({
          ...effectsArgBase(atomInstance.store),
          lastValue: getStableValue(atomInstance),
        });
      }
    }
  });

  initializeSyncAtom(atomInstance, initialValue);

  targetStore.map.set(atomInstance.state.key, atomInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(atomInstance);
  return atomInstance;
};

export const changeAsyncAtomValue = <T>(atomInstance: AsyncAtomInstance<T>, valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => {
  atomInstanceInfoEventEmitter.fireTrySetValue(atomInstance);
  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  const oldValue = getStableValue(atomInstance)!;

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingStatus: WaitingStatus<T> | undefined;

  const changeValuePromise = new Promise<void>(async resolve => {
    try {
      const newValue = await getNewValueFromAsyncAtom(valueOrUpdater, oldValue);
      if (!waitingStatus!.abortRequest) {
        atomInstance.status = {
          type: 'stable',
          value: newValue,
        };

        atomInstance.event.emit({
          type: 'change by promise',
          oldValue,
          newValue,
        });

        if (atomInstance.state.effects?.change != null) {
          if (atomInstance.state.compare == null || !atomInstance.state.compare(oldValue, newValue)) {
            atomInstance.state.effects.change({
              ...effectsArgBase(atomInstance.store),
              oldValue,
              newValue,
            });
          }
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(atomInstance, e);
        const errorInfo = { type: 'error', error } as const;
        atomInstance.status = errorInfo;
        atomInstance.event.emit(errorInfo);

        if (atomInstance.state.effects?.error != null) {
          atomInstance.state.effects.error({
            ...effectsArgBase(atomInstance.store),
            error,
            oldValue,
          });
        }
      } else {
        throw e;
      }
    }

    resolve();
  });

  waitingStatus = {
    type: 'waiting',
    abortRequest: false,
    oldValue,
    promise: changeValuePromise,
  };

  atomInstance.status = waitingStatus;

  atomInstance.event.emit({ type: 'waiting', promise: changeValuePromise });
};

export const changeSyncAtomValue = <T>(atomInstance: SyncAtomInstance<T>, valueOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => {
  atomInstanceInfoEventEmitter.fireTrySetValue(atomInstance);
  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  const oldValue = getStableValue(atomInstance)!;
  try {
    const newValue = getNewValueFromSyncAtom(valueOrUpdater, oldValue);
    const compareFunction: Compare<T> = atomInstance.state.compare ?? defaultCompareFunction;
    if (compareFunction(oldValue, newValue)) return;

    atomInstance.status = {
      type: 'stable',
      value: newValue,
    };
    atomInstance.event.emit({ type: 'change', oldValue, newValue });

    if (atomInstance.state.effects?.change != null) {
      if (atomInstance.state.compare == null || !atomInstance.state.compare(oldValue, newValue)) {
        atomInstance.state.effects.change({
          ...effectsArgBase(atomInstance.store),
          oldValue,
          newValue,
        });
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      atomInstance.event.emit(errorInfo);

      if (atomInstance.state.effects?.error != null) {
        atomInstance.state.effects.error({
          ...effectsArgBase(atomInstance.store),
          error,
          oldValue,
        });
      }
    } else {
      throw e;
    }
  }
};

export const resetAtom = <T>(
  atomInstance: AtomInstance<T>,
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any> | AsyncAtomFamilyValueArg<T, any>
) => {
  if ('default' in atomInstance.state) {
    const syncAtomInstance = atomInstance as SyncAtomInstance<T>;
    initializeSyncAtom(syncAtomInstance, initialValue as SyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any>);
  } else {
    const asyncAtomInstance = atomInstance as AsyncAtomInstance<T>;
    initializeAsyncAtom(asyncAtomInstance, initialValue as AsyncAtomValueArg<T> | AsyncAtomFamilyValueArg<T, any>);
  }

  atomInstance.event.emit({ type: 'reset' });
};
