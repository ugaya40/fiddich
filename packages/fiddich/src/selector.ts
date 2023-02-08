import { FiddichState, StateChangedEvent, FiddichStateInstance, Store } from './core';
import { getStateInstance } from './stateOperator';
import { Disposable } from './util/Disposable';
import { TypedEvent } from './util/TypedEvent';

export type GetState = <TSource>(arg: FiddichState<TSource>) => TSource;

export type Selector<T = any> = {
  type: 'selector';
  key: string;
  get: (arg: { get: GetState }) => T;
};

type SelectorArg<T> = {
  key: string;
  get: (arg: { get: GetState }) => T;
};

export function selector<T>(arg: SelectorArg<T>): Selector<T> {
  return {
    type: 'selector',
    ...arg,
  };
}

export type IndependentSelectorInstance<T = any> = {
  state: Selector<T>;
  storeId: string;
  event: TypedEvent<StateChangedEvent<T>>;
  stateListeners: Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  value?: T;
};

export type SelectorInstance<T = any> = Required<IndependentSelectorInstance<T>>;

export const getSelectorInstanceInternal = <T = unknown>(atom: Selector<T>, nearestStore: Store, ref_storeTree: Store[]): SelectorInstance | null => {
  ref_storeTree.push(nearestStore);
  const nearestStoreResult = nearestStore.map.get(atom.key) as SelectorInstance<T> | undefined;
  if (nearestStoreResult != null) return nearestStoreResult;
  if ('parent' in nearestStore) return getSelectorInstanceInternal(atom, nearestStore.parent, ref_storeTree);
  ref_storeTree.splice(0, ref_storeTree.length);
  return null;
};

const buildGetFunction = (independentSelectorInstance: IndependentSelectorInstance, nearestStore: Store): GetState => {
  const getFunction = <TSource>(state: FiddichState<TSource>): TSource => {
    const { instance: sourceInstance } = getStateInstance(state, nearestStore);

    const existingListener = independentSelectorInstance.stateListeners.get(state);

    if (existingListener == null || existingListener.instance !== sourceInstance) {
      existingListener?.listener?.dispose?.();

      const listener = sourceInstance.event.addListener(event => {
        if (event.type === 'change') {
          const oldValue = independentSelectorInstance.value;
          const newValue = independentSelectorInstance.state.get({ get: getFunction });

          if (oldValue !== newValue) {
            independentSelectorInstance.value = newValue;
            independentSelectorInstance.event.emitAsync({ type: 'change', oldValue, newValue });
          }
        }
      });
      independentSelectorInstance.stateListeners.set(state, { instance: sourceInstance, listener });
    }

    return sourceInstance.value;
  };

  return getFunction;
};

export const getSelectorInstance = <T = unknown>(selector: Selector<T>, nearestStore: Store): { instance: SelectorInstance<T>; storeTree: Store[] } => {
  const ref_storeTree: Store[] = [];
  const selectorInstanceFromStore = getSelectorInstanceInternal<T>(selector, nearestStore, ref_storeTree);

  if (selectorInstanceFromStore != null) return { instance: selectorInstanceFromStore, storeTree: ref_storeTree };

  const independentSelectorInstance = {
    state: selector,
    event: new TypedEvent(),
    storeId: nearestStore.id,
    stateListeners: new Map<FiddichState<any>, { instance: FiddichStateInstance<any>; listener: Disposable }>(),
  } as IndependentSelectorInstance<T> | SelectorInstance<T>;

  const getFunction = buildGetFunction(independentSelectorInstance, nearestStore);

  independentSelectorInstance.value = independentSelectorInstance.state.get({ get: getFunction });
  const selectorInstance = independentSelectorInstance as SelectorInstance<T>;

  nearestStore.map.set(selectorInstance.state.key, selectorInstance);
  ref_storeTree.push(nearestStore);

  return { instance: selectorInstance, storeTree: ref_storeTree };
};
