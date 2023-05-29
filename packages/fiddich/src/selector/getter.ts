import { selectorInstanceInfoEventEmitter } from '../globalFiddichEvent';
import {
  Compare,
  ContextStorePlaceType,
  FiddichState,
  FiddichStateInstance,
  HierarchicalStorePlaceType,
  NamedStorePlaceType,
  NormalStorePlaceType,
  RootStorePlaceType,
  StorePlaceType,
  SyncFiddichState,
  WaitingStatus,
} from '../shareTypes';
import { StateInstanceError } from '../stateUtil/StateInstanceError';
import { getOrAddStateInstance } from '../stateUtil/getInstance';
import { getStableValue, getValue } from '../stateUtil/getValue';
import { SubOperationExecutionContext, effectArgEveryStorePlaceType, fireChangeEffect, fireErrorEffect } from '../stateUtil/instanceOperation';
import { defaultCompareFunction, invalidStatusErrorText } from '../util/const';
import { lazyFunction } from '../util/util';
import {
  AsyncSelector,
  AsyncSelectorFamily,
  AsyncSelectorGetArgsType,
  AsyncSelectorInstance,
  GetState,
  GetStateAsync,
  SyncSelector,
  SyncSelectorFamily,
  SyncSelectorGetArgsType,
  SyncSelectorInstance,
} from './selector';

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
        if (event.type === 'waiting' || event.type === 'change') {
          if ('abortRequest' in selectorInstance.status) selectorInstance.status.abortRequest = true;

          const isInitialized = selectorInstance.status.type !== 'waiting for initialize';
          const state = selectorInstance.state as AsyncSelector<T> | AsyncSelectorFamily<T, unknown>;
          const oldValue = getStableValue(selectorInstance);

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
            isInitialized,
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
        if (event.type === 'change' || event.type === 'change by promise' || event.type === 'error') {
          const state = selectorInstance.state as SyncSelector<T> | SyncSelectorFamily<T, unknown>;
          const oldValue = getStableValue(selectorInstance);

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

export function syncGetterArg<T, TCell>(selectorInstance: SyncSelectorInstance<T, TCell>): SyncSelectorGetArgsType<TCell> {
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
    ...effectArgEveryStorePlaceType(normalStorePlace, subOperationContext),
    root: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, rootStorePlace)),
      ...effectArgEveryStorePlaceType(rootStorePlace, subOperationContext),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetFunction(selectorInstance, hierarchicalStorePlace)),
      ...effectArgEveryStorePlaceType(hierarchicalStorePlace, subOperationContext),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, namedStorePlace(name))),
      ...effectArgEveryStorePlaceType(namedStorePlace(name), subOperationContext),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetFunction(selectorInstance, contextStorePlace(key))),
      ...effectArgEveryStorePlaceType(contextStorePlace(key), subOperationContext),
    }),
    cell: selectorInstance.cell,
  };
}

export function asyncGetterArg<T, TCell>(selectorInstance: AsyncSelectorInstance<T, TCell>): AsyncSelectorGetArgsType<TCell> {
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
    ...effectArgEveryStorePlaceType(normalStorePlace, subOperationContext),
    root: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, rootStorePlace)),
      ...effectArgEveryStorePlaceType(rootStorePlace, subOperationContext),
    },
    hierarchical: {
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, hierarchicalStorePlace)),
      ...effectArgEveryStorePlaceType(hierarchicalStorePlace, subOperationContext),
    },
    named: (name: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, namedStorePlace(name))),
      ...effectArgEveryStorePlaceType(namedStorePlace(name), subOperationContext),
    }),
    context: (key: string) => ({
      get: lazyFunction(() => buildGetAsyncFunction(selectorInstance, contextStorePlace(key))),
      ...effectArgEveryStorePlaceType(contextStorePlace(key), subOperationContext),
    }),
    cell: selectorInstance.cell,
  };
}
