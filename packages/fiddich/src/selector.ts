import { FiddichState, StateChangedEvent, FiddichStateInstance, Store, StateInstanceStatus, PendingStatus } from './core';
import { getStateInstance } from './stateOperator';
import { Disposable } from './util/Disposable';
import { TypedEvent } from './util/TypedEvent';

export type GetState = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

export type Selector<T = any> = {
  type: 'selector';
  key: string;
  get: (arg: { get: GetState }) => Promise<T>;
};

type SelectorArg<T> = {
  key: string;
  get: (arg: { get: GetState }) => Promise<T>;
};

export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    type: 'selector',
    ...arg,
  };
}

export type SelectorInstance<T = any> = {
  state: Selector<T>;
  storeId: string;
  event: TypedEvent<StateChangedEvent<T>>;
  stateListeners: Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: StateInstanceStatus<T>;
};

export const getSelectorInstanceInternal = <T = unknown>(atom: Selector<T>, nearestStore: Store, ref_storeTree: Store[]): SelectorInstance | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(atom.key) as SelectorInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if ('parent' in nearestStore) return getSelectorInstanceInternal(atom, nearestStore.parent, ref_storeTree);
  ref_storeTree.splice(0, ref_storeTree.length);
  return null;
};

const buildGetFunction = <T>(selectorInstance: SelectorInstance<T>, nearestStore: Store): GetState => {
  const getFunction = async <TSource>(state: FiddichState<TSource>): Promise<TSource> => {
    const { instance: sourceInstance } = getStateInstance(state, nearestStore);

    const existingListener = selectorInstance.stateListeners.get(state);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(async event => {
        if (event.type === 'change') {
          if (selectorInstance.status.type === 'pending') selectorInstance.status.abortRequest = true;
          const oldValue = selectorInstance.status.type === 'pending' ? selectorInstance.status.oldValue : selectorInstance.status.value;

          selectorInstance.status = {
            type: 'pending',
            oldValue,
            abortRequest: false,
            promise: selectorInstance.state.get({ get: getFunction }),
          };

          const newValue = await selectorInstance.status.promise!;

          if (oldValue !== newValue && !selectorInstance.status.abortRequest) {
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

    if (sourceInstance.status.type === 'pending') {
      return sourceInstance.status.promise!;
    } else {
      return sourceInstance.status.value;
    }
  };

  return getFunction;
};

export const getSelectorInstance = <T = unknown>(selector: Selector<T>, nearestStore: Store): { instance: SelectorInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const selectorInstanceFromStore = getSelectorInstanceInternal<T>(selector, nearestStore, ref_storeTree);

  if (selectorInstanceFromStore != null) return { instance: selectorInstanceFromStore, storeTree: ref_storeTree };

  const selectorInstance: SelectorInstance<T> = {
    state: selector,
    event: new TypedEvent(),
    storeId: nearestStore.id,
    status: {
      type: 'pending',
      abortRequest: false,
      oldValue: undefined,
    },
    stateListeners: new Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  };

  const getFunction = buildGetFunction(selectorInstance, nearestStore);

  const status = selectorInstance.status as PendingStatus<T>;
  status.promise = selectorInstance.state.get({ get: getFunction });

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
