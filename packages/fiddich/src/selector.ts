import { getAtomInstance } from './atom';
import { FiddichState, FiddichStateInstance, Store, StateInstanceStatus, PendingStatus, StateInstanceEvent, Compare } from './core';
import { Disposable, TypedEvent } from './util/TypedEvent';

export type GetState = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

export type Selector<T = any> = {
  type: 'selector';
  key: string;
  get: (arg: { get: GetState }) => Promise<T>;
  compare?: Compare<T>;
};

type SelectorArg<T> = {
  key: string;
  get: (arg: { get: GetState }) => Promise<T>;
  compare?: Compare<T>;
};

export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    type: 'selector',
    ...arg,
  };
}

export type SelectorFamily<T = unknown, P = any> = {
  type: 'selectorFamily';
  key: string;
  baseKey: string;
  get: (arg: { get: GetState; parameter: P }) => Promise<T>;
  parameter: P;
  compare?: Compare<T>;
};

type SelectorFamilyArg<T, P> = {
  key: string;
  get: (arg: { get: GetState; parameter: P }) => Promise<T>;
  stringfy?: (arg: P) => string;
  compare?: Compare<T>;
};

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

export type SelectorInstance<T = unknown> = {
  state: Selector<T> | SelectorFamily<T, any>;
  storeId: string;
  event: TypedEvent<StateInstanceEvent<T>>;
  stateListeners: Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: StateInstanceStatus<T>;
};

export const getSelectorInstanceInternal = <T = unknown>(
  atom: Selector<T> | SelectorFamily<T>,
  nearestStore: Store,
  ref_storeTree: Store[],
  forceNearest: boolean
): SelectorInstance<T> | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(atom.key) as SelectorInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if (!forceNearest && 'parent' in nearestStore) return getSelectorInstanceInternal(atom, nearestStore.parent, ref_storeTree, forceNearest);
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

const buildGetFunction = <T>(selectorInstance: SelectorInstance<T>, nearestStore: Store, forceNearest: boolean): GetState => {
  const getFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const { instance: sourceInstance } = getStateInstance(state, nearestStore, forceNearest);

    const existingListener = selectorInstance.stateListeners.get(state);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(async event => {
        const state = selectorInstance.state;

        if (event.type === 'pending' || (event.type === 'change' && event.promise == null)) {
          if (selectorInstance.status.type === 'pending') selectorInstance.status.abortRequest = true;

          const oldValue = selectorInstance.status.type === 'pending' ? selectorInstance.status.oldValue : selectorInstance.status.value;
          const pendingPromise =
            state.type === 'selectorFamily' ? state.get({ get: getFunction, parameter: state.parameter }) : state.get({ get: getFunction });

          selectorInstance.status = {
            type: 'pending',
            oldValue,
            abortRequest: false,
            promise: pendingPromise,
          };

          selectorInstance.event.emit({ type: 'pending', promise: selectorInstance.status.promise! });
        }

        if (event.type === 'change') {
          const oldStatus = selectorInstance.status as PendingStatus<T>;
          const newValue = await oldStatus.promise!;
          const compareFunction: Compare<T> = selectorInstance.state.compare ?? ((o, n) => o === n);

          if (!compareFunction(oldStatus.oldValue, newValue) && !oldStatus.abortRequest) {
            selectorInstance.status = {
              type: 'stable',
              value: newValue,
            };
            selectorInstance.event.emit({ type: 'change', oldValue: oldStatus.oldValue, newValue, promise: oldStatus.promise });
          }
        }
      });
      selectorInstance.stateListeners.set(state, { instance: sourceInstance, listener });
    }

    if (sourceInstance.status.type === 'pending') {
      return sourceInstance.status.promise!;
    } else {
      return sourceInstance.status.value;
    }
  };

  return getFunction;
};

export const getSelectorInstance = <T = unknown>(
  selector: Selector<T> | SelectorFamily<T>,
  nearestStore: Store,
  forceNearest: boolean
): { instance: SelectorInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const selectorInstanceFromStore = getSelectorInstanceInternal<T>(selector, nearestStore, ref_storeTree, forceNearest);

  if (selectorInstanceFromStore != null) return { instance: selectorInstanceFromStore, storeTree: ref_storeTree };

  const selectorInstance: SelectorInstance<T> = {
    state: selector,
    event: new TypedEvent(),
    storeId: nearestStore.id,
    status: {
      type: 'pending',
      abortRequest: false,
      oldValue: undefined,
      promise: undefined,
    },
    stateListeners: new Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  const getFunction = buildGetFunction(selectorInstance, nearestStore, forceNearest);

  const status = selectorInstance.status as PendingStatus<T>;
  const state = selectorInstance.state;
  status.promise = state.type === 'selectorFamily' ? state.get({ get: getFunction, parameter: state.parameter }) : state.get({ get: getFunction });

  new Promise(async resolve => {
    const result = await status.promise!;
    if (!status.abortRequest) {
      selectorInstance.status = {
        type: 'stable',
        value: result,
      };
    }
    resolve(undefined);
  });

  nearestStore.map.set(selectorInstance.state.key, selectorInstance);
  ref_storeTree.push(nearestStore);

  return { instance: selectorInstance, storeTree: ref_storeTree };
};
