import { getAtomInstance } from './atom';
import {
  FiddichState,
  FiddichStateInstance,
  PendingStatus,
  Compare,
  PendingEvent,
  PendingForSourceEvent,
  ChangedEvent,
  ChangedByPromiseEvent,
  PendingForSourceStatus,
  StableStatus,
  StorePlaceType,
} from './core';
import { Disposable, eventPublisher, EventPublisher } from './event';
import { getNamedStore, getRootStore } from './util';

export type GetState = <TSource>(arg: FiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type AsyncSelectorGetArgsType = {
  get: GetStateAsync;
  nearest: { get: GetStateAsync };
  root: { get: GetStateAsync };
  named: (name: string) => { get: GetStateAsync };
};
type SyncSelectorGetArgsType = {
  get: GetState;
  nearest: { get: GetState };
  root: { get: GetState };
  named: (name: string) => { get: GetState };
};

type SelectorBase<T = any> = {
  type: 'selector';
  key: string;
  compare?: Compare<T>;
};

export type SyncSelector<T> = SelectorBase<T> & {
  get: (arg: SyncSelectorGetArgsType) => T;
};

export type AsyncSelector<T> = SelectorBase<T> & {
  getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
};

export type Selector<T = any> = SyncSelector<T> | AsyncSelector<T>;

type SelectorArg<T> = {
  key: string;
  compare?: Compare<T>;
} & (
  | {
      getAsync: (arg: AsyncSelectorGetArgsType) => Promise<T>;
    }
  | {
      get: (arg: SyncSelectorGetArgsType) => T;
    }
);

export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    type: 'selector',
    ...arg,
  };
}

type SelectorFamilyBase<T = unknown, P = any> = {
  type: 'selectorFamily';
  key: string;
  baseKey: string;
  parameter: P;
  compare?: Compare<T>;
};

type AsyncSelectorFamilyGetArgsType<P> = AsyncSelectorGetArgsType & { parameter: P };
type SyncSelectorFamilyGetArgsType<P> = SyncSelectorGetArgsType & { parameter: P };

export type SyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  get: (arg: SyncSelectorFamilyGetArgsType<P>) => T;
};

export type AsyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<P>) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = any> = SyncSelectorFamily<T, P> | AsyncSelectorFamily<T, P>;

type SelectorFamilyArg<T, P> = {
  key: string;
  stringfy?: (arg: P) => string;
  compare?: Compare<T>;
} & (
  | {
      getAsync: (arg: AsyncSelectorFamilyGetArgsType<P>) => Promise<T>;
    }
  | {
      get: (arg: SyncSelectorFamilyGetArgsType<P>) => T;
    }
);

type SelectorFamilyFunction<T = unknown, P = unknown> = (arg: P) => SelectorFamily<T, P>;

export const selectorFamily = <T, P>(arg: SelectorFamilyArg<T, P>): SelectorFamilyFunction<T, P> => {
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
};

export type SelectorInstance<T> = {
  state: Selector<T> | SelectorFamily<T, any>;
  storeId: string;
  event: EventPublisher<PendingEvent<T> | PendingForSourceEvent | ChangedEvent<T> | ChangedByPromiseEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: PendingStatus<T> | PendingForSourceStatus<T> | StableStatus<T>;
};

type UninitializedSelectorInstance<T> = Omit<SelectorInstance<T>, 'status'>;
function asSelectorInstance<T>(arg: UninitializedSelectorInstance<T>): asserts arg is SelectorInstance<T> {}

const getSelectorInstanceInternal = <T = unknown>(
  selector: Selector<T> | SelectorFamily<T>,
  storePlaceType: StorePlaceType
): SelectorInstance<T> | undefined => {
  if (storePlaceType.type === 'named') {
    const store = getNamedStore(storePlaceType.name);
    return store.map.get(selector.key) as SelectorInstance<T> | undefined;
  } else if (storePlaceType.type === 'nearest') {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(selector.key) as SelectorInstance<T> | undefined;
    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }
  } else if (storePlaceType.type === 'normal') {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(selector.key) as SelectorInstance<T> | undefined;
    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }
    if ('parent' in storePlaceType.nearestStore) {
      return getSelectorInstanceInternal(selector, { type: storePlaceType.type, nearestStore: storePlaceType.nearestStore.parent });
    }
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore).map.get(selector.key) as SelectorInstance<T> | undefined;
  }

  return undefined;
};

export const getSelectorInstance = <T>(selector: Selector<T> | SelectorFamily<T>, storePlaceType: StorePlaceType): SelectorInstance<T> => {
  const selectorInstanceFromStore = getSelectorInstanceInternal<T>(selector, storePlaceType);

  if (selectorInstanceFromStore != null) return selectorInstanceFromStore;

  const targetStore =
    storePlaceType.type === 'named'
      ? getNamedStore(storePlaceType.name)
      : storePlaceType.type === 'root'
      ? getRootStore(storePlaceType.nearestStore)
      : storePlaceType.nearestStore;

  const selectorInstance: UninitializedSelectorInstance<T> | SelectorInstance<T> = {
    state: selector,
    event: eventPublisher(),
    storeId: targetStore.id,
    stateListeners: new Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  const state = selectorInstance.state;

  asSelectorInstance(selectorInstance);

  if ('getAsync' in state) {
    const getterArg = asyncGetterArg(selectorInstance, storePlaceType);

    const pendingStatus: PendingStatus<T> = {
      type: 'pending',
      abortRequest: false,
      oldValue: undefined,
      promise:
        state.type === 'selectorFamily'
          ? state.getAsync({
              ...getterArg,
              parameter: state.parameter,
            })
          : state.getAsync(getterArg),
    };
    selectorInstance.status = pendingStatus;
    new Promise<void>(async resolve => {
      const result = await pendingStatus.promise;
      if (!pendingStatus.abortRequest) {
        selectorInstance.status = {
          type: 'stable',
          value: result,
        };
      }
      resolve();
    });
  } else if ('get' in state) {
    try {
      const getterArg = syncGetterArg(selectorInstance, storePlaceType);

      const value = state.type === 'selectorFamily' ? state.get({ ...getterArg, parameter: state.parameter }) : state.get(getterArg);
      const stableStatus: StableStatus<T> = {
        type: 'stable',
        value,
      };
      selectorInstance.status = stableStatus;
    } catch (e) {
      if (e instanceof Promise) {
        selectorInstance.stateListeners.forEach(arg => arg.listener.dispose());
      }
      throw e;
    }
  }
  targetStore.map.set(selectorInstance.state.key, selectorInstance);

  return selectorInstance;
};

export const getStateInstance = <T = unknown>(state: FiddichState<T>, storePlaceType: StorePlaceType): FiddichStateInstance<T> => {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return getAtomInstance(state, storePlaceType);
  } else {
    return getSelectorInstance(state, storePlaceType);
  }
};

const getStateListenerkey = <T>(selectorInstance: UninitializedSelectorInstance<T>, storePlaceType: StorePlaceType) => {
  const existingListenerStoreKey = storePlaceType.type === 'named' ? `named-${storePlaceType.name}` : storePlaceType.type;
  return `${existingListenerStoreKey}-${selectorInstance.state.key}`;
};

const buildGetAsyncFunction = <T>(selectorInstance: UninitializedSelectorInstance<T>, storePlaceType: StorePlaceType): GetStateAsync => {
  const getAsyncFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const sourceInstance = getStateInstance(state, storePlaceType);
    const compareFunction: Compare<T> = selectorInstance.state.compare ?? ((o, n) => o === n);
    const listenerKey = getStateListenerkey(selectorInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = asyncGetterArg<T>(selectorInstance, storePlaceType);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(async event => {
        asSelectorInstance(selectorInstance);
        const state = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, unknown>;
        const oldValue = selectorInstance.status.type === 'stable' ? selectorInstance.status.value : selectorInstance.status.oldValue;

        if (event.type === 'pending' || event.type === 'change') {
          if (selectorInstance.status.type === 'pending') selectorInstance.status.abortRequest = true;
          const pendingPromise =
            state.type === 'selectorFamily'
              ? state.getAsync({
                  ...getterArg,
                  parameter: state.parameter,
                })
              : state.getAsync(getterArg);

          selectorInstance.status = {
            type: 'pending',
            oldValue,
            abortRequest: false,
            promise: pendingPromise,
          };
          selectorInstance.event.emit({ type: 'pending', promise: pendingPromise });

          const newValue = await pendingPromise;

          if (!compareFunction(oldValue, newValue) && !selectorInstance.status.abortRequest) {
            selectorInstance.status = {
              type: 'stable',
              value: newValue,
            };
            selectorInstance.event.emit({ type: 'change by promise', oldValue, newValue, promise: pendingPromise });
          }
        }
      });
      selectorInstance.stateListeners.set(listenerKey, { instance: sourceInstance, listener });
    }

    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else {
      return (sourceInstance.status as PendingStatus<TSource>).promise;
    }
  };

  return getAsyncFunction;
};

const buildGetFunction = <T>(selectorInstance: UninitializedSelectorInstance<T>, storePlaceType: StorePlaceType): GetState => {
  const getFunction = <TSource>(state: FiddichState<TSource>): TSource => {
    const sourceInstance = getStateInstance(state, storePlaceType);
    const compareFunction: Compare<T> = selectorInstance.state.compare ?? ((o, n) => o === n);
    const listenerKey = getStateListenerkey(selectorInstance, storePlaceType);
    const existingListener = selectorInstance.stateListeners.get(listenerKey);
    const getterArg = syncGetterArg<T>(selectorInstance, storePlaceType);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        asSelectorInstance(selectorInstance);
        const state = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, unknown>;
        const oldValue = selectorInstance.status.type === 'stable' ? selectorInstance.status.value : selectorInstance.status.oldValue;

        if (event.type === 'pending') {
          if (selectorInstance.status.type === 'pending') {
            selectorInstance.status.abortRequest = true;
          }

          selectorInstance.status = {
            type: 'pending for source',
            oldValue,
            promise: event.promise,
          };

          selectorInstance.event.emit({ type: 'pending for source', promise: event.promise });
        } else if (event.type === 'change' || event.type === 'change by promise') {
          const newValue = state.type === 'selectorFamily' ? state.get({ ...getterArg, parameter: state.parameter }) : state.get(getterArg);
          if (!compareFunction(oldValue, newValue)) {
            selectorInstance.status = {
              type: 'stable',
              value: newValue,
            };
            selectorInstance.event.emit({ type: 'change', oldValue, newValue });
          }
        }
      });
      selectorInstance.stateListeners.set(listenerKey, { instance: sourceInstance, listener });
    }

    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else {
      throw sourceInstance.status.promise;
    }
  };

  return getFunction;
};

function syncGetterArg<T>(selectorInstance: UninitializedSelectorInstance<T>, storePlaceType: StorePlaceType): SyncSelectorGetArgsType {
  const nearestStore = storePlaceType.type === 'named' ? getNamedStore(storePlaceType.name) : storePlaceType.nearestStore;
  return {
    get: buildGetFunction(selectorInstance, {
      type: 'normal',
      nearestStore,
    }),
    root: {
      get: buildGetFunction(selectorInstance, {
        type: 'root',
        nearestStore,
      }),
    },
    nearest: {
      get: buildGetFunction(selectorInstance, {
        type: 'nearest',
        nearestStore,
      }),
    },
    named: (name: string) => ({
      get: buildGetFunction(selectorInstance, {
        type: 'named',
        name,
      }),
    }),
  };
}

function asyncGetterArg<T>(selectorInstance: UninitializedSelectorInstance<T>, storePlaceType: StorePlaceType): AsyncSelectorGetArgsType {
  const nearestStore = storePlaceType.type === 'named' ? getNamedStore(storePlaceType.name) : storePlaceType.nearestStore;
  return {
    get: buildGetAsyncFunction(selectorInstance, {
      type: 'normal',
      nearestStore,
    }),
    root: {
      get: buildGetAsyncFunction(selectorInstance, {
        type: 'root',
        nearestStore,
      }),
    },
    nearest: {
      get: buildGetAsyncFunction(selectorInstance, {
        type: 'nearest',
        nearestStore,
      }),
    },
    named: (name: string) => ({
      get: buildGetAsyncFunction(selectorInstance, {
        type: 'named',
        name,
      }),
    }),
  };
}
