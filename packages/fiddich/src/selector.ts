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
} from './shareTypes';
import { Disposable, eventPublisher, EventPublisher } from './util/event';
import { defaultCompareFunction, getFiddichInstance, getStableValue, getStoreByStorePlace, getValue } from './util/util';
import { getOrAddAsyncAtomInstance, getOrAddSyncAtomInstance } from './atom';
import { invalidStatusErrorText, nameAndGlobalNamedStoreMap } from './util/const';

export type GetState = <TSource>(arg: SyncFiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;
export type GetSnapshot = <TSource>(arg: FiddichState<TSource>) => TSource | undefined;
export type GetSnapshotAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type AsyncSelectorGetArgsType = {
  get: GetStateAsync;
  snapshot: GetSnapshotAsync;
  hierarchy: { get: GetStateAsync; snapshot: GetSnapshotAsync };
  root: { get: GetStateAsync; snapshot: GetSnapshotAsync };
  named: (name: string) => { get: GetStateAsync; snapshot: GetSnapshotAsync };
};
type SyncSelectorGetArgsType = {
  get: GetState;
  snapshot: GetSnapshot;
  hierarchy: { get: GetState; snapshot: GetSnapshot };
  root: { get: GetState; snapshot: GetSnapshot };
  named: (name: string) => { get: GetState; snapshot: GetSnapshot };
};

type SelectorBase = {
  type: 'selector';
  key: string;
  compare?: Compare;
};

export type SyncSelector<T> = SelectorBase & {
  get: (arg: SyncSelectorGetArgsType) => T;
};

export type AsyncSelector<T> = SelectorBase & {
  noSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
};

export type Selector<T = any> = SyncSelector<T> | AsyncSelector<T>;

type SelectorArgBase<T> = {
  key: string;
  compare?: Compare;
};

export type SyncSelectorArg<T> = SelectorArgBase<T> & {
  get: (arg: SyncSelectorGetArgsType) => Awaited<T>;
};

export type AsyncSelectorArg<T> = SelectorArgBase<T> & {
  noSuspense?: boolean;
  getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
};

export type SelectorArg<T> = SyncSelectorArg<T> | AsyncSelectorArg<T>;

export function selector<T>(arg: AsyncSelectorArg<T>): AsyncSelector<T>;
export function selector<T>(arg: SyncSelectorArg<T>): SyncSelector<T>;
export function selector<T>(arg: SelectorArg<T>): Selector<T>;
export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    type: 'selector',
    ...arg,
  };
}

type SelectorFamilyBase<P = any> = {
  type: 'selectorFamily';
  key: string;
  baseKey: string;
  parameter: P;
  compare?: Compare;
};

type AsyncSelectorFamilyGetArgsType<P> = AsyncSelectorGetArgsType & { parameter: P };
type SyncSelectorFamilyGetArgsType<P> = SyncSelectorGetArgsType & { parameter: P };

export type SyncSelectorFamily<T, P> = SelectorFamilyBase<P> & {
  get: (arg: SyncSelectorFamilyGetArgsType<P>) => T;
};

export type AsyncSelectorFamily<T, P> = SelectorFamilyBase<P> & {
  noSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<P>) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = any> = SyncSelectorFamily<T, P> | AsyncSelectorFamily<T, P>;

type SelectorFamilyArgBase<P> = {
  key: string;
  stringfy?: (arg: P) => string;
  compare?: Compare;
};

export type SyncSelectorFamilyArg<T, P> = SelectorFamilyArgBase<P> & {
  get: (arg: SyncSelectorFamilyGetArgsType<P>) => Awaited<T>;
};

export type AsyncSelectorFamilyArg<T, P> = SelectorFamilyArgBase<P> & {
  noSuspense?: boolean;
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<P>) => Promise<T>;
};

export type SelectorFamilyArg<T, P> = SyncSelectorFamilyArg<T, P> | AsyncSelectorFamilyArg<T, P>;

type SyncSelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => SyncSelectorFamily<T, P>;
type AsyncSelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => AsyncSelectorFamily<T, P>;
type SelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => SelectorFamily<T, P>;

export function selectorFamily<T, P>(arg: SyncSelectorFamilyArg<T, P>): SyncSelectorFamilyFunction<T, P>;
export function selectorFamily<T, P>(arg: AsyncSelectorFamilyArg<T, P>): AsyncSelectorFamilyFunction<T, P>;
export function selectorFamily<T, P>(arg: SelectorFamilyArg<T, P>): SelectorFamilyFunction<T, P> {
  const { key: baseKey, stringfy, ...other } = arg;
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

export type SyncSelectorInstanceEvent<T> = InitializedEvent<T> | ChangedEvent<T> | ErrorEvent;
export type AsyncSelectorInstanceEvent<T> = InitializedEvent<T> | WaitingEvent | ChangedByPromiseEvent<T> | ErrorEvent;

export type SyncSelectorInstance<T = unknown> = {
  state: SyncSelector<T> | SyncSelectorFamily<T, any>;
  storeId: string;
  event: EventPublisher<SyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: SyncSelectorInstanceStatus<T>;
};

export type AsyncSelectorInstance<T = unknown> = {
  state: AsyncSelector<T> | AsyncSelectorFamily<T, any>;
  storeId: string;
  event: EventPublisher<AsyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: AsyncSelectorInstanceStatus<T>;
};

export type SelectorInstance<T = unknown> = SyncSelectorInstance<T> | AsyncSelectorInstance<T>;

export const getOrAddAsyncSelectorInstance = <T>(selector: AsyncSelector<T> | AsyncSelectorFamily<T, any>, storePlaceType: StorePlaceType): AsyncSelectorInstance<T> => {
  const selectorInstanceFromStore = getFiddichInstance<T>(selector, storePlaceType) as AsyncSelectorInstance<T> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getStoreByStorePlace(storePlaceType);

  const selectorInstance: AsyncSelectorInstance<T> = {
    state: selector,
    event: eventPublisher(),
    storeId: targetStore.id,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  const state = selectorInstance.state;

  const getterArg = asyncGetterArg(selectorInstance, storePlaceType);

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const initializePromise = new Promise<void>(async resolve => {
    try {
      const value = await (state.type === 'selectorFamily' ? state.getAsync({ ...getterArg, parameter: state.parameter }) : state.getAsync(getterArg));
      if (!waitingForInitializeStatus!.abortRequest) {
        selectorInstance.status = {
          type: 'stable',
          value: value,
        };
        selectorInstance.event.emit({ type: 'initialized', value: value });
      }
    } catch (e) {
      if (e instanceof Error) {
        const errorInfo = { type: 'error', error: e } as const;
        selectorInstance.status = errorInfo;
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

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  return selectorInstance;
};

export const getOrAddSyncSelectorInstance = <T>(selector: SyncSelector<T> | SyncSelectorFamily<T, any>, storePlaceType: StorePlaceType): SyncSelectorInstance<T> => {
  const selectorInstanceFromStore = getFiddichInstance<T>(selector, storePlaceType) as SyncSelectorInstance<T> | undefined;
  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore = getStoreByStorePlace(storePlaceType);

  const selectorInstance: SyncSelectorInstance<T> = {
    state: selector,
    event: eventPublisher(),
    storeId: targetStore.id,
    status: { type: 'unknown' },
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  const state = selectorInstance.state;

  const getterArg = syncGetterArg(selectorInstance, storePlaceType);
  try {
    const value = state.type === 'selectorFamily' ? state.get({ ...getterArg, parameter: state.parameter }) : state.get(getterArg);

    selectorInstance.status = {
      type: 'stable',
      value: value,
    };

    selectorInstance.event.emit({ type: 'initialized', value: value });
  } catch (e) {
    if (e instanceof Error) {
      const errorInfo = { type: 'error', error: e } as const;
      selectorInstance.status = errorInfo;
      selectorInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }

  targetStore.map.set(selectorInstance.state.key, selectorInstance);
  return selectorInstance;
};

export const getOrAddStateInstance = <T = unknown>(state: FiddichState<T>, storePlaceType: StorePlaceType): FiddichStateInstance<T> => {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    if ('default' in state) {
      return getOrAddSyncAtomInstance(state, storePlaceType);
    } else {
      return getOrAddAsyncAtomInstance(state, storePlaceType);
    }
  } else {
    if ('get' in state) {
      return getOrAddSyncSelectorInstance(state, storePlaceType);
    } else {
      return getOrAddAsyncSelectorInstance(state, storePlaceType);
    }
  }
};

const buildSnapshotAsyncFunction = (storePlaceType: StorePlaceType): GetSnapshotAsync => {
  const snapshotAsyncFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType);
    return await getValue(sourceInstance);
  };
  return snapshotAsyncFunction;
};

const buildSnapshotFunction = (storePlaceType: StorePlaceType): GetSnapshot => {
  const snapshotFunction = <TSource>(state: FiddichState<TSource>): TSource | undefined => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType)!;
    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else if (sourceInstance.status.type === 'error') {
      throw sourceInstance.status.error;
    } else if (sourceInstance.status.type === 'waiting') {
      return sourceInstance.status.oldValue;
    } else if (sourceInstance.status.type === 'waiting for initialize') {
      return undefined;
    } else {
      throw new Error(invalidStatusErrorText);
    }
  };
  return snapshotFunction;
};

const getStateListenerkey = <T>(selectorInstance: SelectorInstance<T>, storePlaceType: StorePlaceType) => {
  const existingListenerStoreKey = storePlaceType.type === 'named' ? `named-${storePlaceType.name}` : storePlaceType.type;
  return `${existingListenerStoreKey}-${selectorInstance.state.key}`;
};

const buildGetAsyncFunction = <T>(selectorInstance: AsyncSelectorInstance<T>, storePlaceType: StorePlaceType): GetStateAsync => {
  const getAsyncFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType);
    const listenerKey = getStateListenerkey(selectorInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = asyncGetterArg<T>(selectorInstance, storePlaceType);

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
                    parameter: state.parameter,
                  })
                : state.getAsync(getterArg));

              if (!waitingStatus!.abortRequest) {
                selectorInstance.status = {
                  type: 'stable',
                  value: newValue,
                };
                selectorInstance.event.emit({ type: 'change by promise', oldValue, newValue });
              }
            } catch (e) {
              if (e instanceof Error) {
                const errorInfo = { type: 'error', error: e } as const;
                selectorInstance.status = errorInfo;
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
            oldValue,
          };

          selectorInstance.status = waitingStatus;

          selectorInstance.event.emit({ type: 'waiting', promise: waitingPromise });
        }
      });
      selectorInstance.stateListeners.set(listenerKey, { instance: sourceInstance, listener });
    }
    return getValue(sourceInstance);
  };

  return getAsyncFunction;
};

const buildGetFunction = <T>(selectorInstance: SyncSelectorInstance<T>, storePlaceType: StorePlaceType): GetState => {
  const getFunction = <TSource>(state: SyncFiddichState<TSource>): TSource => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType);
    const compareFunction: Compare = selectorInstance.state.compare ?? defaultCompareFunction;
    const listenerKey = getStateListenerkey(selectorInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = syncGetterArg<T>(selectorInstance, storePlaceType);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        const state = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, unknown>;
        const oldValue = getStableValue(selectorInstance);

        if (event.type === 'change' || event.type === 'change by promise') {
          try {
            const newValue = state.type === 'selectorFamily' ? state.get({ ...getterArg, parameter: state.parameter }) : state.get(getterArg);

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
          } catch (e) {
            if (e instanceof Error) {
              const errorInfo = { type: 'error', error: e } as const;
              selectorInstance.status = errorInfo;
              selectorInstance.event.emit(errorInfo);
            } else {
              throw e;
            }
          }
        }
      });
      selectorInstance.stateListeners.set(listenerKey, { instance: sourceInstance, listener });
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

function syncGetterArg<T>(selectorInstance: SyncSelectorInstance<T>, storePlaceType: StorePlaceType): SyncSelectorGetArgsType {
  const nearestStore = storePlaceType.type === 'named' ? nameAndGlobalNamedStoreMap.get(storePlaceType.name)! : storePlaceType.nearestStore;
  const normalStorePlace: NormalStorePlaceType = { type: 'normal', nearestStore };
  const rootStorePlace: RootStorePlaceType = { type: 'root', nearestStore };
  const hierarchicalStorePlace: HierarchicalStorePlaceType = { type: 'hierarchical', nearestStore };
  const namedStorePlace: (name: string) => NamedStorePlaceType = (name: string) => ({ type: 'named', name });
  return {
    get: buildGetFunction(selectorInstance, normalStorePlace),
    snapshot: buildSnapshotFunction(normalStorePlace),
    root: {
      get: buildGetFunction(selectorInstance, rootStorePlace),
      snapshot: buildSnapshotFunction(rootStorePlace),
    },
    hierarchy: {
      get: buildGetFunction(selectorInstance, hierarchicalStorePlace),
      snapshot: buildSnapshotFunction(hierarchicalStorePlace),
    },
    named: (name: string) => ({
      get: buildGetFunction(selectorInstance, namedStorePlace(name)),
      snapshot: buildSnapshotFunction(namedStorePlace(name)),
    }),
  };
}

function asyncGetterArg<T>(selectorInstance: AsyncSelectorInstance<T>, storePlaceType: StorePlaceType): AsyncSelectorGetArgsType {
  const nearestStore = storePlaceType.type === 'named' ? nameAndGlobalNamedStoreMap.get(storePlaceType.name)! : storePlaceType.nearestStore;
  const normalStorePlace: NormalStorePlaceType = { type: 'normal', nearestStore };
  const rootStorePlace: RootStorePlaceType = { type: 'root', nearestStore };
  const hierarchicalStorePlace: HierarchicalStorePlaceType = { type: 'hierarchical', nearestStore };
  const namedStorePlace: (name: string) => NamedStorePlaceType = (name: string) => ({ type: 'named', name });
  return {
    get: buildGetAsyncFunction(selectorInstance, normalStorePlace),
    snapshot: buildSnapshotAsyncFunction(normalStorePlace),
    root: {
      get: buildGetAsyncFunction(selectorInstance, rootStorePlace),
      snapshot: buildSnapshotAsyncFunction(rootStorePlace),
    },
    hierarchy: {
      get: buildGetAsyncFunction(selectorInstance, hierarchicalStorePlace),
      snapshot: buildSnapshotAsyncFunction(hierarchicalStorePlace),
    },
    named: (name: string) => ({
      get: buildGetAsyncFunction(selectorInstance, namedStorePlace(name)),
      snapshot: buildSnapshotAsyncFunction(namedStorePlace(name)),
    }),
  };
}
