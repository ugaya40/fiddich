import { getAtomInstance } from './atom';
import {
  FiddichState,
  FiddichStateInstance,
  Store,
  PendingStatus,
  Compare,
  PendingEvent,
  PendingForSourceEvent,
  ChangedEvent,
  ChangedByPromiseEvent,
  PendingForSourceStatus,
  StableStatus,
} from './core';
import { Disposable, TypedEvent } from './util/TypedEvent';

export type GetState = <TSource>(arg: FiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type SelectorBase<T = any> = {
  type: 'selector';
  key: string;
  compare?: Compare<T>;
};

type SyncSelector<T> = SelectorBase<T> & {
  get: (arg: { get: GetState }) => T;
};

type AsyncSelector<T> = SelectorBase<T> & {
  getAsync: (arg: { get: GetStateAsync }) => Promise<T>;
};

export type Selector<T = any> = SyncSelector<T> | AsyncSelector<T>;

type SelectorArg<T> = {
  key: string;
  compare?: Compare<T>;
} & (
  | {
      getAsync: (arg: { get: GetStateAsync }) => Promise<T>;
    }
  | {
      get: (arg: { get: GetState }) => T;
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

type SyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  get: (arg: { get: GetState; parameter: P }) => T;
};

type AsyncSelectorFamily<T, P> = SelectorFamilyBase<T, P> & {
  getAsync: (arg: { get: GetStateAsync; parameter: P }) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = any> = SyncSelectorFamily<T, P> | AsyncSelectorFamily<T, P>;

type SelectorFamilyArg<T, P> = {
  key: string;
  stringfy?: (arg: P) => string;
  compare?: Compare<T>;
} & (
  | {
      getAsync: (arg: { get: GetStateAsync; parameter: P }) => Promise<T>;
    }
  | {
      get: (arg: { get: GetState; parameter: P }) => T;
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
  event: TypedEvent<PendingEvent<T> | PendingForSourceEvent | ChangedEvent<T> | ChangedByPromiseEvent<T>>;
  stateListeners: Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: PendingStatus<T> | PendingForSourceStatus<T> | StableStatus<T>;
};

type UninitializedSelectorInstance<T> = Omit<SelectorInstance<T>, 'status'>;

export const getSelectorInstanceInternal = <T = unknown>(
  selector: Selector<T> | SelectorFamily<T>,
  nearestStore: Store,
  ref_storeTree: Store[],
  forceNearest: boolean
): SelectorInstance<T> | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(selector.key) as SelectorInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if (!forceNearest && 'parent' in nearestStore) return getSelectorInstanceInternal(selector, nearestStore.parent, ref_storeTree, forceNearest);
  ref_storeTree.splice(0, ref_storeTree.length);
  return null;
};

const getStateInstance = <T = unknown>(
  state: FiddichState<T>,
  nearestStore: Store,
  forceNearest: boolean
): { instance: FiddichStateInstance<T>; storeTree: Store[] } => {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return getAtomInstance(state, nearestStore, forceNearest);
  } else {
    return getSelectorInstance(state, nearestStore, forceNearest);
  }
};

function asSelectorInstance<T>(arg: UninitializedSelectorInstance<T> | SelectorInstance<T>): asserts arg is SelectorInstance<T> {}

const buildGetAsyncFunction = <T>(selectorInstance: UninitializedSelectorInstance<T>, nearestStore: Store): GetStateAsync => {
  const getAsyncFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const { instance: sourceInstance } = getStateInstance(state, nearestStore, false);
    const compareFunction: Compare<T> = selectorInstance.state.compare ?? ((o, n) => o === n);
    const existingListener = selectorInstance.stateListeners.get(state);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(async event => {
        asSelectorInstance(selectorInstance);
        const state = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, unknown>;
        const oldValue = selectorInstance.status.type === 'stable' ? selectorInstance.status.value : selectorInstance.status.oldValue;

        if (event.type === 'pending' || event.type === 'change') {
          if (selectorInstance.status.type === 'pending') selectorInstance.status.abortRequest = true;

          const pendingPromise =
            state.type === 'selectorFamily' ? state.getAsync({ get: getAsyncFunction, parameter: state.parameter }) : state.getAsync({ get: getAsyncFunction });

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
      selectorInstance.stateListeners.set(state, { instance: sourceInstance, listener });
    }

    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else {
      return (sourceInstance.status as PendingStatus<TSource>).promise;
    }
  };

  return getAsyncFunction;
};

const buildGetFunction = <T>(selectorInstance: UninitializedSelectorInstance<T>, nearestStore: Store): GetState => {
  const getFunction = <TSource>(state: FiddichState<TSource>): TSource => {
    const { instance: sourceInstance } = getStateInstance(state, nearestStore, false);
    const compareFunction: Compare<T> = selectorInstance.state.compare ?? ((o, n) => o === n);
    const existingListener = selectorInstance.stateListeners.get(state);

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
          const newValue = state.type === 'selectorFamily' ? state.get({ get: getFunction, parameter: state.parameter }) : state.get({ get: getFunction });

          if (!compareFunction(oldValue, newValue)) {
            selectorInstance.status = {
              type: 'stable',
              value: newValue,
            };
            selectorInstance.event.emit({ type: 'change', oldValue, newValue });
          }
        }
      });
      selectorInstance.stateListeners.set(state, { instance: sourceInstance, listener });
    }

    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else {
      throw sourceInstance.status.promise;
    }
  };

  return getFunction;
};

export const getSelectorInstance = <T>(
  selector: Selector<T> | SelectorFamily<T>,
  nearestStore: Store,
  forceNearest: boolean
): { instance: SelectorInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const selectorInstanceFromStore = getSelectorInstanceInternal<T>(selector, nearestStore, ref_storeTree, forceNearest);

  if (selectorInstanceFromStore != null) return { instance: selectorInstanceFromStore, storeTree: ref_storeTree };

  const selectorInstance: UninitializedSelectorInstance<T> | SelectorInstance<T> = {
    state: selector,
    event: new TypedEvent(),
    storeId: nearestStore.id,
    stateListeners: new Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  asSelectorInstance(selectorInstance);
  const state = selectorInstance.state;

  if ('getAsync' in state) {
    const getAsyncFunction = buildGetAsyncFunction(selectorInstance, nearestStore);
    const pendingStatus: PendingStatus<T> = {
      type: 'pending',
      abortRequest: false,
      oldValue: undefined,
      promise:
        state.type === 'selectorFamily' ? state.getAsync({ get: getAsyncFunction, parameter: state.parameter }) : state.getAsync({ get: getAsyncFunction }),
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
    const getFunction = buildGetFunction(selectorInstance, nearestStore);
    try {
      const value = state.type === 'selectorFamily' ? state.get({ get: getFunction, parameter: state.parameter }) : state.get({ get: getFunction });
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
  nearestStore.map.set(selectorInstance.state.key, selectorInstance);
  ref_storeTree.push(nearestStore);

  return { instance: selectorInstance, storeTree: ref_storeTree };
};
