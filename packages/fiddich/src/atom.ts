import type {
  WaitingStatus,
  Compare,
  WaitingEvent,
  ChangedEvent,
  ChangedByPromiseEvent,
  StableStatus,
  StorePlaceType,
  WaitingForInitializeStatus,
  ErrorStatus,
  ErrorEvent,
  UnknownStatus,
  InitializedEvent,
} from './shareTypes';
import { EventPublisher, eventPublisher } from './util/event';
import { defaultCompareFunction, getFiddichInstance, getStableValue, getStoreByStorePlace, StrictUnion } from './util/util';

export type SyncAtomValueArg<T> = Awaited<T> | (() => Awaited<T>);
export type AsyncAtomValueArg<T> = Promise<T> | Awaited<T> | (() => Promise<T> | Awaited<T>);

export type SyncAtomSetterOrUpdaterArg<T> = T | ((old: T | undefined) => T);
export type AsyncAtomSetterOrUpdaterArg<T> = T | Promise<T> | ((old: T | undefined) => T | Promise<T>);
export type AtomSetterOrUpdaterArg<T> = SyncAtomSetterOrUpdaterArg<T> | AsyncAtomSetterOrUpdaterArg<T>;

export type SyncAtomSetterOrUpdater<T> = (setterOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => void;
export type AsyncAtomSetterOrUpdater<T> = (setterOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => void;
export type AtomSetterOrUpdater<T> = SyncAtomSetterOrUpdater<T> | AsyncAtomSetterOrUpdater<T>;

type AtomBase = {
  type: 'atom';
  key: string;
  compare?: Compare;
};

export type SyncAtom<T> = AtomBase & {
  default: SyncAtomValueArg<T>;
};

export type AsyncAtom<T> = AtomBase & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

export type Atom<T = any> = SyncAtom<T> | AsyncAtom<T>;

type AtomArgBase = {
  key: string;
  compare?: Compare;
};

type SyncAtomArg<T> = AtomArgBase & {
  default: SyncAtomValueArg<T>;
};
type AsyncAtomArg<T> = AtomArgBase & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

type AtomArg<T> = StrictUnion<SyncAtomArg<T> | AsyncAtomArg<T>>;

export function atom<T>(arg: SyncAtomArg<T>): SyncAtom<T>;
export function atom<T>(arg: AsyncAtomArg<T>): AsyncAtom<T>;
export function atom<T>(arg: AtomArg<T>): Atom<T>;
export function atom<T>(arg: AtomArg<T>): Atom<T> {
  const result: Atom<T> = {
    ...arg,
    type: 'atom',
  };

  return result;
}

type SyncAtomFamilyValueArg<T, P> = Awaited<T> | ((arg: P) => Awaited<T>);
type AsyncAtomFamilyValueArg<T, P> = Promise<T> | Awaited<T> | ((arg: P) => Promise<T> | Awaited<T>);

type AtomFamilyBase<P = any> = {
  type: 'atomFamily';
  key: string;
  baseKey: string;
  parameter: P;
  compare?: Compare;
};

export type SyncAtomFamily<T, P> = AtomFamilyBase<P> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamily<T, P> = AtomFamilyBase<P> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamily<T = unknown, P = any> = SyncAtomFamily<T, P> | AsyncAtomFamily<T, P>;

type AtomFamilyArgBase<T, P> = {
  key: string;
  stringfy?: (arg: P) => string;
  compare?: Compare;
};

type SyncAtomFamilyArg<T, P> = AtomFamilyArgBase<T, P> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

type AsyncAtomFamilyArg<T, P> = AtomFamilyArgBase<T, P> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

type AtomFamilyArg<T, P> = SyncAtomFamilyArg<T, P> | AsyncAtomFamilyArg<T, P>;

type SyncAtomFamilyFunction<T = unknown, P = unknown> = (arg: P) => SyncAtomFamily<T, P>;
type AsyncAtomFamilyFunction<T = unknown, P = unknown> = (arg: P) => AsyncAtomFamily<T, P>;
type AtomFamilyFunction<T = any, P = any> = (arg: P) => AtomFamily<T, P>;

export function atomFamily<T, P>(arg: SyncAtomFamilyArg<T, P>): SyncAtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AsyncAtomFamilyArg<T, P>): AsyncAtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P>;
export function atomFamily<T, P>(arg: AtomFamilyArg<T, P>): AtomFamilyFunction<T, P> {
  const { key: baseKey, stringfy, ...other } = arg;
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

export type SyncAtomInstanceEvent<T> = InitializedEvent<T> | ChangedEvent<T> | ErrorEvent;
export type AsyncAtomInstanceEvent<T> = InitializedEvent<T> | WaitingEvent | ChangedByPromiseEvent<T> | ErrorEvent;

export type SyncAtomInstance<T = unknown> = {
  state: SyncAtom<T> | SyncAtomFamily<T, any>;
  storeId: string;
  status: SyncAtomInstanceStatus<T>;
  event: EventPublisher<SyncAtomInstanceEvent<T>>;
};

export type AsyncAtomInstance<T = unknown> = {
  state: AsyncAtom<T> | AsyncAtomFamily<T, any>;
  storeId: string;
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

export const getOrAddAsyncAtomInstance = <T = unknown>(
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  storePlaceType: StorePlaceType,
  initialValue?: AsyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as AsyncAtomInstance<T> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const parameter = atom.type === 'atomFamily' ? atom.parameter : undefined;
  const targetStore = getStoreByStorePlace(storePlaceType);

  const atomInstance: AsyncAtomInstance<T> = {
    state: atom,
    event: eventPublisher(),
    storeId: targetStore.id,
    status: { type: 'unknown' },
  };

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const initializePromise = new Promise<void>(async resolve => {
    try {
      const decidedInitialValue = initialValue ?? atom.asyncDefault;
      const initialValuePromise = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;
      const actualInitialValue = await initialValuePromise;
      if (!waitingForInitializeStatus!.abortRequest) {
        atomInstance.status = {
          type: 'stable',
          value: actualInitialValue,
        };
        atomInstance.event.emit({
          type: 'initialized',
          value: actualInitialValue,
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        const errorInfo = { type: 'error', error: e } as const;
        atomInstance.status = errorInfo;
        atomInstance.event.emit(errorInfo);
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

  targetStore.map.set(atomInstance.state.key, atomInstance);
  return atomInstance;
};

export const getOrAddSyncAtomInstance = <T = unknown>(
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  storePlaceType: StorePlaceType,
  initialValue?: SyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as SyncAtomInstance<T> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const parameter = atom.type === 'atomFamily' ? atom.parameter : undefined;
  const targetStore = getStoreByStorePlace(storePlaceType);

  const atomInstance: SyncAtomInstance<T> = {
    state: atom,
    event: eventPublisher(),
    storeId: targetStore.id,
    status: { type: 'unknown' },
  };

  try {
    const decidedInitialValue = initialValue ?? atom.default;
    const actualInitialValue = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;

    atomInstance.status = {
      type: 'stable',
      value: actualInitialValue,
    };

    atomInstance.event.emit({ type: 'initialized', value: actualInitialValue });
  } catch (e) {
    if (e instanceof Error) {
      const errorInfo = { type: 'error', error: e } as const;
      atomInstance.status = errorInfo;
      atomInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }

  targetStore.map.set(atomInstance.state.key, atomInstance);
  return atomInstance;
};

export const changeAsyncAtomValue = <T>(atomInstance: AsyncAtomInstance<T>, valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => {
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
      }
    } catch (e) {
      if (e instanceof Error) {
        const errorInfo = { type: 'error', error: e } as const;
        atomInstance.status = errorInfo;
        atomInstance.event.emit(errorInfo);
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
  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  const oldValue = getStableValue(atomInstance)!;
  try {
    const newValue = getNewValueFromSyncAtom(valueOrUpdater, oldValue);
    const compareFunction: Compare = atomInstance.state.compare ?? defaultCompareFunction;
    if (compareFunction<T>(oldValue, newValue)) return;

    atomInstance.status = {
      type: 'stable',
      value: newValue,
    };

    atomInstance.event.emit({ type: 'change', oldValue, newValue });
  } catch (e) {
    if (e instanceof Error) {
      const errorInfo = { type: 'error', error: e } as const;
      atomInstance.status = errorInfo;
      atomInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};
