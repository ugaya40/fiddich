import type {
  FiddichState,
  FiddichStateInstance,
  WaitingStatus,
  Compare,
  WaitingEvent,
  ChangedEvent,
  ChangedByPromiseEvent,
  StableStatus,
  StorePlaceType,
  NormalStorePlaceType,
  RootStorePlaceType,
  NamedStorePlaceType,
  WaitingForInitializeStatus,
  HierarchicalStorePlaceType,
  ErrorStatus,
  ErrorEvent,
  InitializedEvent,
  UnknownStatus,
  SyncFiddichState,
  Store,
  ContextStorePlaceType,
  ResetEvent,
} from './shareTypes';
import { Disposable, eventPublisher, EventPublisher } from './util/event';
import { generateRandomKey, lazyFunction } from './util/util';
import { defaultCompareFunction, invalidStatusErrorText } from './util/const';
import {
  EffectsType,
  GetSnapshot,
  SetAsyncAtom,
  SetSyncAtom,
  StateInstanceError,
  StrictUnion,
  buildSetAsyncAtomFunction,
  buildSetSyncAtomFunction,
  buildSnapshotFunction,
  effectsArgBase,
  getFiddichInstance,
  getOrAddStateInstance,
  getStableValue,
  getValue,
  resetStoreStates,
} from './util/stateUtil';
import { getContextStore, getNewValueStore, getRootStore } from './util/storeUtil';
import { getNamedStore } from './namedStore';

export type GetState = <TSource>(arg: SyncFiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type AsyncSelectorGetArgsType = {
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
};
type SyncSelectorGetArgsType = {
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
};

type SelectorBase<T> = {
  type: 'selector';
  key: string;
  name?: string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

export type SyncSelector<T> = SelectorBase<T> & {
  get: (arg: SyncSelectorGetArgsType) => Awaited<T>;
};

export type AsyncSelector<T> = SelectorBase<T> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
};

export type Selector<T = any> = SyncSelector<T> | AsyncSelector<T>;

type SelectorArgBase<T> = {
  name?: string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

export type SyncSelectorArg<T> = SelectorArgBase<T> & {
  get: (arg: SyncSelectorGetArgsType) => Awaited<T>;
};

export type AsyncSelectorArg<T> = SelectorArgBase<T> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
};

export type SelectorArg<T> = StrictUnion<SyncSelectorArg<T> | AsyncSelectorArg<T>>;

export function selector<T>(arg: AsyncSelectorArg<T>): AsyncSelector<T>;
export function selector<T>(arg: SyncSelectorArg<T>): SyncSelector<T>;
export function selector<T>(arg: SelectorArg<T>): Selector<T>;
export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    key: generateRandomKey(),
    type: 'selector',
    ...arg,
  };
}

type SelectorFamilyBase<T = any, P = any> = {
  type: 'selectorFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

type AsyncSelectorFamilyGetArgsType<T, P> = AsyncSelectorGetArgsType & {
  param: P;
};
type SyncSelectorFamilyGetArgsType<T, P> = SyncSelectorGetArgsType & {
  param: P;
};

export type SyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P>) => T;
};

export type AsyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P>) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = any> = SyncSelectorFamily<T, P> | AsyncSelectorFamily<T, P>;

type SelectorFamilyArgBase<T, P> = {
  name?: string;
  stringfy?: (arg: P) => string;
  compare?: Compare<T>;
  effects?: EffectsType<T>;
};

export type SyncSelectorFamilyArg<T, P> = SelectorFamilyArgBase<T, P> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P>) => Awaited<T>;
};

export type AsyncSelectorFamilyArg<T, P> = SelectorFamilyArgBase<T, P> & {
  suppressSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P>) => Promise<T>;
};

export type SelectorFamilyArg<T, P> = SyncSelectorFamilyArg<T, P> | AsyncSelectorFamilyArg<T, P>;

export type SyncSelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => SyncSelectorFamily<T, P>;
export type AsyncSelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => AsyncSelectorFamily<T, P>;
export type SelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => SelectorFamily<T, P>;

export function selectorFamily<T, P>(arg: SyncSelectorFamilyArg<T, P>): SyncSelectorFamilyFunction<T, P>;
export function selectorFamily<T, P>(arg: AsyncSelectorFamilyArg<T, P>): AsyncSelectorFamilyFunction<T, P>;
export function selectorFamily<T, P>(arg: SelectorFamilyArg<T, P>): SelectorFamilyFunction<T, P> {
  const baseKey = generateRandomKey();
  const { stringfy, ...other } = arg;
  const result: SelectorFamilyFunction<T, P> = parameter => {
    const key = `${baseKey}-familyKey-${stringfy != null ? stringfy(parameter) : `${parameter}`}`;
    return {
      ...other,
      key,
      baseKey,
      parameter,
      type: 'selectorFamily',
    };
  };

  return result;
}

type SyncSelectorInstanceStatus<T> = UnknownStatus | StableStatus<T> | ErrorStatus;
type AsyncSelectorInstanceStatus<T> = UnknownStatus | WaitingForInitializeStatus | StableStatus<T> | WaitingStatus<T> | ErrorStatus;

export type SyncSelectorInstanceEvent<T> = InitializedEvent<T> | ChangedEvent<T> | ErrorEvent | ResetEvent;
export type AsyncSelectorInstanceEvent<T> = InitializedEvent<T> | WaitingEvent | ChangedByPromiseEvent<T> | ErrorEvent | ResetEvent;

export type SyncSelectorInstance<T = unknown> = {
  id: string;
  state: SyncSelector<T> | SyncSelectorFamily<T, any>;
  store: Store;
  event: EventPublisher<SyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: SyncSelectorInstanceStatus<T>;
};

export type AsyncSelectorInstance<T = unknown> = {
  id: string;
  state: AsyncSelector<T> | AsyncSelectorFamily<T, any>;
  store: Store;
  event: EventPublisher<AsyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: AsyncSelectorInstanceStatus<T>;
};

export type SelectorInstance<T = unknown> = SyncSelectorInstance<T> | AsyncSelectorInstance<T>;

const initializeAsyncSelector = <T>(selectorInstance: AsyncSelectorInstance<T>) => {
  const asyncSelector = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, any>;

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const getterArg = asyncGetterArg(selectorInstance);

  const initializePromise = new Promise<void>(async resolve => {
    try {
      const value = await (asyncSelector.type === 'selectorFamily'
        ? asyncSelector.getAsync({ ...getterArg, param: asyncSelector.parameter })
        : asyncSelector.getAsync(getterArg));
      if (!waitingForInitializeStatus!.abortRequest) {
        selectorInstance.status = {
          type: 'stable',
          value: value,
        };
        selectorInstance.event.emit({ type: 'initialized', value: value });

        if (selectorInstance.state.effects?.init != null) {
          selectorInstance.state.effects.init({
            ...effectsArgBase(selectorInstance.store),
            value,
          });
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(selectorInstance, e);
        const errorInfo = { type: 'error', error } as const;
        selectorInstance.status = errorInfo;
        selectorInstance.event.emit(errorInfo);

        if (selectorInstance.state.effects?.error != null) {
          selectorInstance.state.effects.error({
            ...effectsArgBase(selectorInstance.store),
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

  selectorInstance.status = waitingForInitializeStatus;
};

export const getOrAddAsyncSelectorInstance = <T>(
  selector: AsyncSelector<T> | AsyncSelectorFamily<T, any>,
  storePlaceType: StorePlaceType
): AsyncSelectorInstance<T> => {
  const selectorInstanceFromStore = getFiddichInstance<T>(selector, storePlaceType) as AsyncSelectorInstance<T> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const selectorInstance: AsyncSelectorInstance<T> = {
    id: generateRandomKey(),
    state: selector,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  targetStore.event.addListener(event => {
    if (event === 'destroy') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      if (selectorInstance.state.effects?.destroy != null) {
        selectorInstance.state.effects.destroy({
          ...effectsArgBase(selectorInstance.store),
          lastValue: getStableValue(selectorInstance),
        });
      }
    }
  });

  initializeAsyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  return selectorInstance;
};

const initializeSyncSelector = <T>(selectorInstance: SyncSelectorInstance<T>) => {
  const syncSelector = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, any>;
  const getterArg = syncGetterArg(selectorInstance);
  try {
    const value = syncSelector.type === 'selectorFamily' ? syncSelector.get({ ...getterArg, param: syncSelector.parameter }) : syncSelector.get(getterArg);

    selectorInstance.status = {
      type: 'stable',
      value: value,
    };

    selectorInstance.event.emit({ type: 'initialized', value: value });

    if (selectorInstance.state.effects?.init != null) {
      selectorInstance.state.effects.init({
        ...effectsArgBase(selectorInstance.store),
        value,
      });
    }
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(selectorInstance, e);
      const errorInfo = { type: 'error', error } as const;
      selectorInstance.status = errorInfo;
      selectorInstance.event.emit(errorInfo);

      if (selectorInstance.state.effects?.error != null) {
        selectorInstance.state.effects.error({
          ...effectsArgBase(selectorInstance.store),
          error,
          oldValue: undefined,
        });
      }
    } else {
      throw e;
    }
  }
};

export const getOrAddSyncSelectorInstance = <T>(
  selector: SyncSelector<T> | SyncSelectorFamily<T, any>,
  storePlaceType: StorePlaceType
): SyncSelectorInstance<T> => {
  const selectorInstanceFromStore = getFiddichInstance<T>(selector, storePlaceType) as SyncSelectorInstance<T> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getNewValueStore(storePlaceType);

  const selectorInstance: SyncSelectorInstance<T> = {
    id: generateRandomKey(),
    state: selector,
    event: eventPublisher(),
    store: targetStore,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  targetStore.event.addListener(event => {
    if (event === 'destroy') {
      selectorInstance.stateListeners.forEach(({ listener }) => listener.dispose());
      if (selectorInstance.state.effects?.destroy != null) {
        selectorInstance.state.effects.destroy({
          ...effectsArgBase(selectorInstance.store),
          lastValue: getStableValue(selectorInstance),
        });
      }
    }
  });

  initializeSyncSelector(selectorInstance);

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
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
    const getterArg = asyncGetterArg<T>(selectorInstance);

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
                selectorInstance.event.emit({
                  type: 'change by promise',
                  oldValue,
                  newValue,
                });

                if (selectorInstance.state.effects?.change != null) {
                  if (selectorInstance.state.compare == null || !selectorInstance.state.compare(oldValue, newValue)) {
                    selectorInstance.state.effects.change({
                      ...effectsArgBase(selectorInstance.store),
                      oldValue,
                      newValue,
                    });
                  }
                }
              }
            } catch (e) {
              if (e instanceof Error) {
                const error = new StateInstanceError(selectorInstance, e);
                const errorInfo = { type: 'error', error } as const;
                selectorInstance.status = errorInfo;
                selectorInstance.event.emit(errorInfo);

                if (selectorInstance.state.effects?.error != null) {
                  selectorInstance.state.effects.error({
                    ...effectsArgBase(selectorInstance.store),
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
    const getterArg = syncGetterArg<T>(selectorInstance);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        const state = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, unknown>;
        const oldValue = getStableValue(selectorInstance);

        if (event.type === 'change' || event.type === 'change by promise' || event.type === 'error') {
          try {
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
            selectorInstance.event.emit({ type: 'change', oldValue, newValue });

            if (selectorInstance.state.effects?.change != null) {
              if (selectorInstance.state.compare == null || !selectorInstance.state.compare(oldValue, newValue)) {
                selectorInstance.state.effects.change({
                  ...effectsArgBase(selectorInstance.store),
                  oldValue,
                  newValue,
                });
              }
            }
          } catch (e) {
            if (e instanceof Error) {
              const error = new StateInstanceError(selectorInstance, e);
              const errorInfo = { type: 'error', error } as const;
              selectorInstance.status = errorInfo;
              selectorInstance.event.emit(errorInfo);

              if (selectorInstance.state.effects?.error != null) {
                selectorInstance.state.effects.error({
                  ...effectsArgBase(selectorInstance.store),
                  error,
                  oldValue: undefined,
                });
              }
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

function syncGetterArg<T>(selectorInstance: SyncSelectorInstance<T>): SyncSelectorGetArgsType {
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
  return {
    get: lazyFunction(() => buildGetFunction(selectorInstance, normalStorePlace)),
    snapshot: lazyFunction(() => buildSnapshotFunction(normalStorePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(normalStorePlace)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(normalStorePlace)),
    resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(nearestStore, recursive)),
    root: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, rootStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(rootStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(rootStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(rootStorePlace)),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getRootStore(nearestStore), recursive)),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, hierarchicalStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(hierarchicalStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(hierarchicalStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(hierarchicalStorePlace)),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, namedStorePlace(name))),
      snapshot: lazyFunction(() => buildSnapshotFunction(namedStorePlace(name))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(namedStorePlace(name))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(namedStorePlace(name))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getNamedStore(name), recursive)),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, contextStorePlace(key))),
      snapshot: lazyFunction(() => buildSnapshotFunction(contextStorePlace(key))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(contextStorePlace(key))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(contextStorePlace(key))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getContextStore(key, nearestStore), recursive)),
    }),
  };
}

function asyncGetterArg<T>(selectorInstance: AsyncSelectorInstance<T>): AsyncSelectorGetArgsType {
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
  return {
    get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, normalStorePlace)),
    snapshot: lazyFunction(() => buildSnapshotFunction(normalStorePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(normalStorePlace)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(normalStorePlace)),
    resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(nearestStore, recursive)),
    root: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, rootStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(rootStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(rootStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(rootStorePlace)),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getRootStore(nearestStore), recursive)),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, hierarchicalStorePlace)),
      snapshot: lazyFunction(() => buildSnapshotFunction(hierarchicalStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(hierarchicalStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(hierarchicalStorePlace)),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, namedStorePlace(name))),
      snapshot: lazyFunction(() => buildSnapshotFunction(namedStorePlace(name))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(namedStorePlace(name))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(namedStorePlace(name))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getNamedStore(name), recursive)),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, contextStorePlace(key))),
      snapshot: lazyFunction(() => buildSnapshotFunction(contextStorePlace(key))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(contextStorePlace(key))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(contextStorePlace(key))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getContextStore(key, nearestStore), recursive)),
    }),
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
