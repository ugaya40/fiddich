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
  CellFactory,
} from './shareTypes';
import { defaultCompareFunction } from './util/const';
import { EventPublisher, eventPublisher } from './util/event';
import { instanceInfoEventEmitter } from './globalFiddichEvent';
import {
  EffectsType,
  FamilyEffectsTypes,
  NotFunction,
  StateInstanceError,
  StrictUnion,
  fireChangeEffect,
  fireErrorEffect,
  fireFinalizeEffect,
  fireInitEffect,
  getFiddichInstance,
  getStableValue,
} from './util/stateUtil';
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

type AtomBase<T, TCell> = {
  type: 'atom';
  key: string;
  name?: string;
  cell: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncAtom<T, TCell = undefined> = AtomBase<T, TCell> & {
  default: SyncAtomValueArg<T>;
};

export type AsyncAtom<T, TCell = undefined> = AtomBase<T, TCell> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

export type Atom<T = unknown, TCell = any> = SyncAtom<T, TCell> | AsyncAtom<T, TCell>;

type AtomArgBase<T, TCell> = {
  name?: string;
  compare?: Compare<T>;
  cell?: CellFactory<TCell>;
  effects?: EffectsType<T, TCell>;
};

export type SyncAtomArg<T, TCell = any> = AtomArgBase<T, TCell> & {
  default: SyncAtomValueArg<T>;
};
export type AsyncAtomArg<T, TCell = any> = AtomArgBase<T, TCell> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomValueArg<T>;
};

export type AtomArg<T, TCell = any> = StrictUnion<SyncAtomArg<T, TCell> | AsyncAtomArg<T, TCell>>;

export function atom<T, TCell = undefined>(arg: SyncAtomArg<T, TCell>): SyncAtom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AsyncAtomArg<T, TCell>): AsyncAtom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AtomArg<T, TCell>): Atom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AtomArg<T, TCell>): Atom<T, TCell> {
  const { cell, ...other } = arg;
  const result: Atom<T, TCell> = {
    key: generateRandomKey(),
    ...other,
    cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
    type: 'atom',
  };

  return result;
}

type SyncAtomFamilyValueArg<T, P> = Awaited<T> | ((arg: P) => Awaited<T>);
type AsyncAtomFamilyValueArg<T, P> = Promise<T> | Awaited<T> | ((arg: P) => Promise<T> | Awaited<T>);

type AtomFamilyBase<T, P, TCell> = {
  type: 'atomFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  cell: CellFactory<TCell>;
  parameterString: string;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncAtomFamily<T, P, TCell = undefined> = AtomFamilyBase<T, P, TCell> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamily<T, P, TCell = undefined> = AtomFamilyBase<T, P, TCell> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamily<T = unknown, P = unknown, TCell = undefined> = SyncAtomFamily<T, P, TCell> | AsyncAtomFamily<T, P, TCell>;

export type AtomFamilyArgBase<T, P, TCell> = {
  name?: string;
  stringfy?: (arg: P) => string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncAtomFamilyArg<T, P, TCell> = AtomFamilyArgBase<T, P, TCell> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamilyArg<T, P, TCell> = AtomFamilyArgBase<T, P, TCell> & {
  suppressSuspense?: boolean;
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamilyArg<T, P, TCell> = SyncAtomFamilyArg<T, P, TCell> | AsyncAtomFamilyArg<T, P, TCell>;

export type SyncAtomFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SyncAtomFamily<T, P, TCell>;
export type AsyncAtomFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => AsyncAtomFamily<T, P, TCell>;
export type AtomFamilyFunction<T = any, P = any, TCell = undefined> = (arg: P) => AtomFamily<T, P, TCell>;

export function atomFamily<T, P, TCell = undefined>(arg: SyncAtomFamilyArg<T, P, TCell>): SyncAtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AsyncAtomFamilyArg<T, P, TCell>): AsyncAtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AtomFamilyArg<T, P, TCell>): AtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AtomFamilyArg<T, P, TCell>): AtomFamilyFunction<T, P, TCell> {
  const baseKey = generateRandomKey();
  const { stringfy, cell, ...other } = arg;
  const result: AtomFamilyFunction<T, P, TCell> = parameter => {
    const parameterString = stringfy != null ? stringfy(parameter) : `${JSON.stringify(parameter)}`;
    const key = `${baseKey}-familyKey-${parameterString}`;
    return {
      ...other,
      cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
      parameter,
      stringfy,
      key,
      parameterString,
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

export type SyncAtomInstance<T = unknown, TCell = any> = {
  id: string;
  state: SyncAtom<T, TCell> | SyncAtomFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  status: SyncAtomInstanceStatus<T>;
  event: EventPublisher<SyncAtomInstanceEvent<T>>;
};

export type AsyncAtomInstance<T = unknown, TCell = any> = {
  id: string;
  state: AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  status: AsyncAtomInstanceStatus<T>;
  event: EventPublisher<AsyncAtomInstanceEvent<T>>;
};

export type AtomInstance<T = unknown, TCell = any> = SyncAtomInstance<T, TCell> | AsyncAtomInstance<T, TCell>;

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

const initializeAsyncAtom = <T, TCell>(atomInstance: AsyncAtomInstance<T, TCell>, initialValue?: AsyncAtomValueArg<T> | AsyncAtomFamilyValueArg<T, any>) => {
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

        fireInitEffect(atomInstance, actualInitialValue);

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
        fireErrorEffect(atomInstance, undefined, error);
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
};

const initializeSyncAtom = <T, TCell>(atomInstance: SyncAtomInstance<T, TCell>, initialValue?: SyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any>) => {
  const syncAtom = atomInstance.state as SyncAtom<T> | SyncAtomFamily<T, any>;
  const parameter = syncAtom.type === 'atomFamily' ? syncAtom.parameter : undefined;

  try {
    const decidedInitialValue = initialValue ?? syncAtom.default;
    const actualInitialValue = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;

    atomInstance.status = {
      type: 'stable',
      value: actualInitialValue,
    };

    fireInitEffect(atomInstance, actualInitialValue);

    atomInstance.event.emit({ type: 'initialized', value: actualInitialValue });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      fireErrorEffect(atomInstance, undefined, error);
      atomInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};

export const getOrAddAsyncAtomInstance = <T = unknown, TCell = any>(
  atom: AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>,
  storePlaceType: StorePlaceType,
  initialValue?: AsyncAtomValueArg<T>
) => {
  const atomInstanceFromStore = getFiddichInstance(atom, storePlaceType) as AsyncAtomInstance<T, TCell> | undefined;
  if (atomInstanceFromStore != null) return atomInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

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

  const targetStore = getNewValueStore(storePlaceType);

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

export const changeAsyncAtomValue = <T>(atomInstance: AsyncAtomInstance<T, any>, valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => {
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

        fireChangeEffect(atomInstance, oldValue, newValue);

        atomInstance.event.emit({
          type: 'change by promise',
          oldValue,
          newValue,
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(atomInstance, e);
        const errorInfo = { type: 'error', error } as const;
        atomInstance.status = errorInfo;
        fireErrorEffect(atomInstance, oldValue, error);
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

export const changeSyncAtomValue = <T>(atomInstance: SyncAtomInstance<T, any>, valueOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => {
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
    fireChangeEffect(atomInstance, oldValue, newValue);
    atomInstance.event.emit({ type: 'change', oldValue, newValue });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      fireErrorEffect(atomInstance, oldValue, error);
      atomInstance.event.emit(errorInfo);
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
