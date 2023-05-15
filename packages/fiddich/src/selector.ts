import type {
  FiddichState,
  FiddichStateInstance,
  WaitingStatus,
  Compare,
  WaitingEventArg,
  ChangedEventArg,
  ChangedByPromiseEventArg,
  StableStatus,
  StorePlaceType,
  NormalStorePlaceType,
  RootStorePlaceType,
  NamedStorePlaceType,
  WaitingForInitializeStatus,
  HierarchicalStorePlaceType,
  ErrorStatus,
  ErrorEventArg,
  InitializedEventArg,
  UnknownStatus,
  SyncFiddichState,
  Store,
  ContextStorePlaceType,
  ResetEventArg,
  CellFactory,
} from './shareTypes';
import { Disposable, eventPublisher, EventPublisher } from './util/event';
import { generateRandomKey, lazyFunction } from './util/util';
import { defaultCompareFunction, invalidStatusErrorText } from './util/const';
import {
  EffectsType,
  FamilyEffectsTypes,
  GetSnapshot,
  SetAsyncAtom,
  SetSyncAtom,
  StateInstanceError,
  StrictUnion,
  SubOperationExecutionContext,
  buildResetStatesFunction,
  buildSetAsyncAtomFunction,
  buildSetSyncAtomFunction,
  buildSnapshotFunction,
  fireChangeEffect,
  fireErrorEffect,
  fireFinalizeEffect,
  fireInitEffect,
  getFiddichInstance,
  getOrAddStateInstance,
  getStableValue,
  getValue,
} from './util/stateUtil';
import { getContextStore, getNewValueStore, getRootStore } from './util/storeUtil';
import { getNamedStore } from './namedStore';
import { instanceInfoEventEmitter, selectorInstanceInfoEventEmitter } from './globalFiddichEvent';

export type GetState = <TSource>(arg: SyncFiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type AsyncSelectorGetArgsType<TCell> = {
  get: GetStateAsync;
  snapshot: GetSnapshot;
  setSyncAtom: SetSyncAtom;
  setAsyncAtom: SetAsyncAtom;
  resetStates: (recursive: boolean) => void;
  hierarchical: { get: GetStateAsync; snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom };
  root: { get: GetStateAsync; snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom; resetStates: (recursive: boolean) => void };
  named: (name: string) => {
    get: GetStateAsync;
    snapshot: GetSnapshot;
    setSyncAtom: SetSyncAtom;
    setAsyncAtom: SetAsyncAtom;
    resetStates: (recursive: boolean) => void;
  };
  context: (name: string) => {
    get: GetStateAsync;
    snapshot: GetSnapshot;
    setSyncAtom: SetSyncAtom;
    setAsyncAtom: SetAsyncAtom;
    resetStates: (recursive: boolean) => void;
  };
  cell: TCell;
};
type SyncSelectorGetArgsType<TCell> = {
  get: GetState;
  snapshot: GetSnapshot;
  setSyncAtom: SetSyncAtom;
  setAsyncAtom: SetAsyncAtom;
  resetStates: (recursive: boolean) => void;
  hierarchical: { get: GetState; snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom };
  root: { get: GetState; snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom; resetStates: (recursive: boolean) => void };
  named: (name: string) => {
    get: GetState;
    snapshot: GetSnapshot;
    setSyncAtom: SetSyncAtom;
    setAsyncAtom: SetAsyncAtom;
    resetStates: (recursive: boolean) => void;
  };
  context: (name: string) => {
    get: GetState;
    snapshot: GetSnapshot;
    setSyncAtom: SetSyncAtom;
    setAsyncAtom: SetAsyncAtom;
    resetStates: (recursive: boolean) => void;
  };
  cell: TCell;
};

type SelectorBase<T, TCell> = {
  type: 'selector';
  key: string;
  name?: string;
  cell: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncSelector<T, TCell = undefined> = SelectorBase<T, TCell> & {
  get: (arg: SyncSelectorGetArgsType<TCell>) => Awaited<T>;
};

export type AsyncSelector<T, TCell = undefined> = SelectorBase<T, TCell> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType<TCell>) => Promise<T>;
};

export type Selector<T = any, TCell = undefined> = SyncSelector<T, TCell> | AsyncSelector<T, TCell>;

type SelectorArgBase<T, TCell> = {
  name?: string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncSelectorArg<T, TCell = undefined> = SelectorArgBase<T, TCell> & {
  get: (arg: SyncSelectorGetArgsType<TCell>) => Awaited<T>;
};

export type AsyncSelectorArg<T, TCell = undefined> = SelectorArgBase<T, TCell> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType<TCell>) => Promise<T>;
};

export type SelectorArg<T, TCell = any> = StrictUnion<SyncSelectorArg<T, TCell> | AsyncSelectorArg<T, TCell>>;

export function selector<T, TCell = undefined>(arg: AsyncSelectorArg<T, TCell>): AsyncSelector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SyncSelectorArg<T, TCell>): SyncSelector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SelectorArg<T, TCell>): Selector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SelectorArg<T, TCell>): Selector<T, TCell> {
  const { cell, ...other } = arg;
  return {
    key: generateRandomKey(),
    type: 'selector',
    cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
    ...other,
  };
}

type SelectorFamilyBase<T = unknown, P = unknown, TCell = any> = {
  type: 'selectorFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  cell: CellFactory<TCell>;
  parameterString: string;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

type AsyncSelectorFamilyGetArgsType<T, P, TCell> = AsyncSelectorGetArgsType<TCell> & {
  param: P;
};
type SyncSelectorFamilyGetArgsType<T, P, TCell> = SyncSelectorGetArgsType<TCell> & {
  param: P;
};

export type SyncSelectorFamily<T = unknown, P = unknown, TCell = undefined> = SelectorFamilyBase<T, P, TCell> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P, TCell>) => T;
};

export type AsyncSelectorFamily<T = unknown, P = unknown, TCell = undefined> = SelectorFamilyBase<T, P, TCell> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P, TCell>) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = unknown, TCell = undefined> = SyncSelectorFamily<T, P, TCell> | AsyncSelectorFamily<T, P, TCell>;

type SelectorFamilyArgBase<T, P, TCell> = {
  name?: string;
  stringfy?: (arg: P) => string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncSelectorFamilyArg<T, P, TCell> = SelectorFamilyArgBase<T, P, TCell> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P, TCell>) => Awaited<T>;
};

export type AsyncSelectorFamilyArg<T, P, TCell> = SelectorFamilyArgBase<T, P, TCell> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P, TCell>) => Promise<T>;
};

export type SelectorFamilyArg<T, P, TCell> = SyncSelectorFamilyArg<T, P, TCell> | AsyncSelectorFamilyArg<T, P, TCell>;

export type SyncSelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SyncSelectorFamily<T, P, TCell>;
export type AsyncSelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => AsyncSelectorFamily<T, P, TCell>;
export type SelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SelectorFamily<T, P, TCell>;

export function selectorFamily<T, P, TCell = undefined>(arg: SyncSelectorFamilyArg<T, P, TCell>): SyncSelectorFamilyFunction<T, P, TCell>;
export function selectorFamily<T, P, TCell = undefined>(arg: AsyncSelectorFamilyArg<T, P, TCell>): AsyncSelectorFamilyFunction<T, P, TCell>;
export function selectorFamily<T, P, TCell = undefined>(arg: SelectorFamilyArg<T, P, TCell>): SelectorFamilyFunction<T, P, TCell> {
  const baseKey = generateRandomKey();
  const { stringfy, cell, ...other } = arg;
  const result: SelectorFamilyFunction<T, P, TCell> = parameter => {
    const parameterString = stringfy != null ? stringfy(parameter) : `${JSON.stringify(parameter)}`;
    const key = `${baseKey}-familyKey-${parameterString}`;
    return {
      ...other,
      cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
      key,
      baseKey,
      parameterString,
      parameter,
      type: 'selectorFamily',
    };
  };

  return result;
}

type SyncSelectorInstanceStatus<T> = UnknownStatus | StableStatus<T> | ErrorStatus;
type AsyncSelectorInstanceStatus<T> = UnknownStatus | WaitingForInitializeStatus | StableStatus<T> | WaitingStatus<T> | ErrorStatus;

export type SyncSelectorInstanceEvent<T> = InitializedEventArg<T> | ChangedEventArg<T> | ErrorEventArg | ResetEventArg;
export type AsyncSelectorInstanceEvent<T> = InitializedEventArg<T> | WaitingEventArg | ChangedByPromiseEventArg<T> | ErrorEventArg | ResetEventArg;

export type SyncSelectorInstance<T = unknown, TCell = any> = {
  id: string;
  state: SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  event: EventPublisher<SyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: SyncSelectorInstanceStatus<T>;
};

export type AsyncSelectorInstance<T = unknown, TCell = any> = {
  id: string;
  state: AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  event: EventPublisher<AsyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: AsyncSelectorInstanceStatus<T>;
};

export type SelectorInstance<T = any, TCell = any> = SyncSelectorInstance<T, TCell> | AsyncSelectorInstance<T, TCell>;

const initializeAsyncSelector = <T>(selectorInstance: AsyncSelectorInstance<T>) => {
  const asyncSelector = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, any>;

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const getterArg = asyncGetterArg(selectorInstance);

  const initializePromise = new Promise<void>(async resolve => {
    try {
      selectorInstanceInfoEventEmitter.fireTryGetValueWhenInitialize(selectorInstance);
      const value = await (asyncSelector.type === 'selectorFamily'
        ? asyncSelector.getAsync({ ...getterArg, param: asyncSelector.parameter })
        : asyncSelector.getAsync(getterArg));
      if (!waitingForInitializeStatus!.abortRequest) {
        selectorInstance.status = {
          type: 'stable',
          value: value,
        };
        fireInitEffect(selectorInstance, value);
        selectorInstance.event.emit({ type: 'initialized', value: value });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(selectorInstance, e);
        const errorInfo = { type: 'error', error } as const;
        selectorInstance.status = errorInfo;
        fireErrorEffect(selectorInstance, undefined, error);
        selectorInstance.event.emit(errorInfo);
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

  selectorInstance.status = waitingForInitializeStatus;
};

export const getOrAddAsyncSelectorInstance = <T, TCell>(
  selector: AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>,
  storePlaceType: StorePlaceType
): AsyncSelectorInstance<T, TCell> => {
  const selectorInstanceFromStore = getFiddichInstance(selector, storePlaceType) as AsyncSelectorInstance<T, TCell> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const selectorInstance: AsyncSelectorInstance<T, TCell> = {
    id: generateRandomKey(),
    state: selector,
    cell: selector.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  instanceInfoEventEmitter.fireInstanceCreated(selectorInstance);
  selectorInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(selectorInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      fireFinalizeEffect(selectorInstance);
    }
  });

  initializeAsyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(selectorInstance);
  return selectorInstance;
};

const initializeSyncSelector = <T>(selectorInstance: SyncSelectorInstance<T, any>) => {
  const syncSelector = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, any>;
  const getterArg = syncGetterArg(selectorInstance);
  try {
    selectorInstanceInfoEventEmitter.fireTryGetValueWhenInitialize(selectorInstance);
    const value = syncSelector.type === 'selectorFamily' ? syncSelector.get({ ...getterArg, param: syncSelector.parameter }) : syncSelector.get(getterArg);

    selectorInstance.status = {
      type: 'stable',
      value: value,
    };
    fireInitEffect(selectorInstance, value);
    selectorInstance.event.emit({ type: 'initialized', value: value });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(selectorInstance, e);
      const errorInfo = { type: 'error', error } as const;
      selectorInstance.status = errorInfo;
      fireErrorEffect(selectorInstance, undefined, error);
      selectorInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};

export const getOrAddSyncSelectorInstance = <T, TCell>(
  selector: SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>,
  storePlaceType: StorePlaceType
): SyncSelectorInstance<T, TCell> => {
  const selectorInstanceFromStore = getFiddichInstance<T, TCell>(selector, storePlaceType) as SyncSelectorInstance<T, TCell> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const selectorInstance: SyncSelectorInstance<T, TCell> = {
    id: generateRandomKey(),
    state: selector,
    cell: selector.cell?.() as TCell,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  instanceInfoEventEmitter.fireInstanceCreated(selectorInstance);
  selectorInstance.event.addListener(event => instanceInfoEventEmitter.fireInstanceEventFired(selectorInstance, event));

  targetStore.event.addListener(event => {
    if (event === 'finalize') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      fireFinalizeEffect(selectorInstance);
    }
  });

  initializeSyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  instanceInfoEventEmitter.fireInstanceRegistered(selectorInstance);
  return selectorInstance;
};

const getStateListenerKey = <T>(sourceInstance: FiddichStateInstance<T>, storePlaceType: StorePlaceType) => {
  const existingListenerStoreKey =
    storePlaceType.type === 'named'
      ? `named-${storePlaceType.name}`
      : storePlaceType.type === 'context'
      ? `context-${storePlaceType.key}`
      : storePlaceType.type;
  return `${existingListenerStoreKey}-${sourceInstance.state.key}`;
};

const buildGetAsyncFunction = <T>(selectorInstance: AsyncSelectorInstance<T>, storePlaceType: StorePlaceType): GetStateAsync => {
  const getAsyncFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType);
    const listenerKey = getStateListenerKey(sourceInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = asyncGetterArg<T, any>(selectorInstance);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        const state = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, unknown>;
        const oldValue = getStableValue(selectorInstance);

        if (event.type === 'waiting' || event.type === 'change') {
          if (selectorInstance.status.type === 'waiting') selectorInstance.status.abortRequest = true;

          //The status of instance may be overwritten while waiting for await,
          //so prepare it as a save destination to determine abortRequest.
          let waitingStatus: WaitingStatus<T> | undefined;

          const waitingPromise = new Promise<void>(async resolve => {
            try {
              selectorInstanceInfoEventEmitter.fireTryGetValueWhenSourceChanged(selectorInstance, sourceInstance);
              const newValue = await (state.type === 'selectorFamily'
                ? state.getAsync({
                    ...getterArg,
                    param: state.parameter,
                  })
                : state.getAsync(getterArg));

              if (!waitingStatus!.abortRequest) {
                selectorInstance.status = {
                  type: 'stable',
                  value: newValue,
                };

                fireChangeEffect(selectorInstance, oldValue, newValue);

                selectorInstance.event.emit({
                  type: 'change by promise',
                  oldValue,
                  newValue,
                });
              }
            } catch (e) {
              if (e instanceof Error) {
                const error = new StateInstanceError(selectorInstance, e);
                const errorInfo = { type: 'error', error } as const;
                selectorInstance.status = errorInfo;
                fireErrorEffect(selectorInstance, oldValue, error);
                selectorInstance.event.emit(errorInfo);
              } else {
                throw e;
              }
            }
            resolve();
          });

          waitingStatus = {
            type: 'waiting',
            promise: waitingPromise,
            abortRequest: false,
            oldValue: oldValue!,
          };

          selectorInstance.status = waitingStatus;

          selectorInstance.event.emit({
            type: 'waiting',
            promise: waitingPromise,
          });
        }
      });
      selectorInstance.stateListeners.set(listenerKey, {
        instance: sourceInstance,
        listener,
      });
    }
    return getValue(sourceInstance);
  };

  return getAsyncFunction;
};

const buildGetFunction = <T>(selectorInstance: SyncSelectorInstance<T>, storePlaceType: StorePlaceType): GetState => {
  const getFunction = <TSource>(state: SyncFiddichState<TSource>): TSource => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType);
    const compareFunction: Compare<T> = selectorInstance.state.compare ?? defaultCompareFunction;
    const listenerKey = getStateListenerKey(sourceInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = syncGetterArg<T, any>(selectorInstance);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        const state = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, unknown>;
        const oldValue = getStableValue(selectorInstance);

        if (event.type === 'change' || event.type === 'change by promise' || event.type === 'error') {
          try {
            selectorInstanceInfoEventEmitter.fireTryGetValueWhenSourceChanged(selectorInstance, sourceInstance);
            const newValue = state.type === 'selectorFamily' ? state.get({ ...getterArg, param: state.parameter }) : state.get(getterArg);

            if (event.type === 'change') {
              if (compareFunction(oldValue, newValue)) {
                return;
              }
            }

            selectorInstance.status = {
              type: 'stable',
              value: newValue,
            };
            fireChangeEffect(selectorInstance, oldValue, newValue);
            selectorInstance.event.emit({ type: 'change', oldValue, newValue });
          } catch (e) {
            if (e instanceof Error) {
              const error = new StateInstanceError(selectorInstance, e);
              const errorInfo = { type: 'error', error } as const;
              selectorInstance.status = errorInfo;
              fireErrorEffect(selectorInstance, undefined, error);
              selectorInstance.event.emit(errorInfo);
            } else {
              throw e;
            }
          }
        }
      });
      selectorInstance.stateListeners.set(listenerKey, {
        instance: sourceInstance,
        listener,
      });
    }

    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else if (sourceInstance.status.type === 'error') {
      throw sourceInstance.status.error;
    } else {
      throw new Error(invalidStatusErrorText);
    }
  };

  return getFunction;
};

function syncGetterArg<T, TCell>(selectorInstance: SyncSelectorInstance<T, TCell>): SyncSelectorGetArgsType<TCell> {
  const nearestStore = selectorInstance.store;
  const normalStorePlace: NormalStorePlaceType = {
    type: 'normal',
    nearestStore,
  };
  const rootStorePlace: RootStorePlaceType = { type: 'root', nearestStore };
  const hierarchicalStorePlace: HierarchicalStorePlaceType = {
    type: 'hierarchical',
    nearestStore,
  };
  const namedStorePlace: (name: string) => NamedStorePlaceType = (name: string) => ({ type: 'named', name });
  const contextStorePlace: (key: string) => ContextStorePlaceType = (key: string) => ({ type: 'context', nearestStore, key });

  const subOperationContext: SubOperationExecutionContext = {
    type: 'selector get',
    instance: selectorInstance,
  };
  return {
    get: lazyFunction(() => buildGetFunction(selectorInstance, normalStorePlace)),
    snapshot: lazyFunction(() => buildSnapshotFunction(normalStorePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(normalStorePlace, subOperationContext)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(normalStorePlace, subOperationContext)),
    resetStates: lazyFunction(() => buildResetStatesFunction(nearestStore, subOperationContext)),
    root: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, rootStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(rootStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(rootStorePlace, subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(rootStorePlace, subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getRootStore(nearestStore), subOperationContext)),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, hierarchicalStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(hierarchicalStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(hierarchicalStorePlace, subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(hierarchicalStorePlace, subOperationContext)),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, namedStorePlace(name))),
      snapshot: lazyFunction(() => buildSnapshotFunction(namedStorePlace(name))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(namedStorePlace(name), subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(namedStorePlace(name), subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getNamedStore(name), subOperationContext)),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, contextStorePlace(key))),
      snapshot: lazyFunction(() => buildSnapshotFunction(contextStorePlace(key))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(contextStorePlace(key), subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(contextStorePlace(key), subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getContextStore(key, nearestStore), subOperationContext)),
    }),
    cell: selectorInstance.cell,
  };
}

function asyncGetterArg<T, TCell>(selectorInstance: AsyncSelectorInstance<T, TCell>): AsyncSelectorGetArgsType<TCell> {
  const nearestStore = selectorInstance.store;
  const normalStorePlace: NormalStorePlaceType = {
    type: 'normal',
    nearestStore,
  };
  const rootStorePlace: RootStorePlaceType = { type: 'root', nearestStore };
  const hierarchicalStorePlace: HierarchicalStorePlaceType = {
    type: 'hierarchical',
    nearestStore,
  };
  const namedStorePlace: (name: string) => NamedStorePlaceType = (name: string) => ({ type: 'named', name });
  const contextStorePlace: (key: string) => ContextStorePlaceType = (key: string) => ({ type: 'context', nearestStore, key });

  const subOperationContext: SubOperationExecutionContext = {
    type: 'selector get',
    instance: selectorInstance,
  };
  return {
    get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, normalStorePlace)),
    snapshot: lazyFunction(() => buildSnapshotFunction(normalStorePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(normalStorePlace, subOperationContext)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(normalStorePlace, subOperationContext)),
    resetStates: lazyFunction(() => buildResetStatesFunction(nearestStore, subOperationContext)),
    root: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, rootStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(rootStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(rootStorePlace, subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(rootStorePlace, subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getRootStore(nearestStore), subOperationContext)),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, hierarchicalStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(hierarchicalStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(hierarchicalStorePlace, subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(hierarchicalStorePlace, subOperationContext)),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, namedStorePlace(name))),
      snapshot: lazyFunction(() => buildSnapshotFunction(namedStorePlace(name))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(namedStorePlace(name), subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(namedStorePlace(name), subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getNamedStore(name), subOperationContext)),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, contextStorePlace(key))),
      snapshot: lazyFunction(() => buildSnapshotFunction(contextStorePlace(key))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(contextStorePlace(key), subOperationContext)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(contextStorePlace(key), subOperationContext)),
      resetStates: lazyFunction(() => buildResetStatesFunction(getContextStore(key, nearestStore), subOperationContext)),
    }),
    cell: selectorInstance.cell,
  };
}

export const resetSelector = <T>(selectorInstance: SelectorInstance<T>) => {
  if ('default' in selectorInstance.state) {
    const syncSelectorInstance = selectorInstance as SyncSelectorInstance<T>;
    initializeSyncSelector(syncSelectorInstance);
  } else {
    const asyncSelectorInstance = selectorInstance as AsyncSelectorInstance<T>;
    initializeAsyncSelector(asyncSelectorInstance);
  }
  selectorInstance.event.emit({ type: 'reset' });
};
