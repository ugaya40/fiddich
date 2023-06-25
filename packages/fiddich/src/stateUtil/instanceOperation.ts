import { EffectStringType, operationInEffectInfoEventEmitter, operationInGetValueInfoEventEmitter, stateInstanceInfoEventEmitter } from '../globalFiddichEvent';
import {
  FiddichState,
  FiddichStateInstance,
  FiddichStore,
  HierarchicalStorePlaceType,
  NamedStorePlaceType,
  NormalStorePlaceType,
  RootStorePlaceType,
  StorePlaceType,
} from '../shareTypes';
import { invalidStatusErrorText } from '../util/const';
import { getOrAddStateInstance } from './getInstance';
import { getStoreForNewInstance } from '../util/storeUtil';
import { lazyFunction } from '../util/util';
import { getStableValue } from './getValue';
import { resetState, resetStoreStates } from './reset';
import { SelectorInstance } from '../selector/selector';
import { AsyncAtom, AsyncAtomFamily, SyncAtom, SyncAtomFamily } from '../atom/atom';
import { AsyncAtomSetterOrUpdaterArg, SyncAtomSetterOrUpdaterArg, changeAsyncAtomValue, changeSyncAtomValue } from '../atom/change';
import { getOrAddAsyncAtomInstance, getOrAddSyncAtomInstance } from '../atom/getOrAddInstance';

export const buildSnapshotFunction = (storePlaceType: StorePlaceType): GetSnapshot => {
  const snapshotFunction = <TSource>(state: FiddichState<TSource>): TSource | undefined => {
    const sourceInstance = getOrAddStateInstance(state, storePlaceType)!;
    if (sourceInstance.status.type === 'stable') {
      return sourceInstance.status.value;
    } else if (sourceInstance.status.type === 'error') {
      throw sourceInstance.status.error;
    } else if (sourceInstance.status.type === 'waiting') {
      return sourceInstance.status.oldValue;
    } else if (sourceInstance.status.type === 'waiting for initialize') {
      return sourceInstance.status.oldValue;
    } else {
      throw new Error(invalidStatusErrorText);
    }
  };
  return snapshotFunction;
};

export type SubOperationExecutionContext =
  | {
      type: 'instance effect';
      effectType: EffectStringType;
      instance: FiddichStateInstance;
    }
  | {
      type: 'selector get';
      instance: SelectorInstance;
    }
  | {
      type: 'named store operator';
      store: FiddichStore;
    }
  | {
      type: 'useStore';
      componentName: string | undefined;
    };

export const buildSetSyncAtomFunction = (storePlaceType: StorePlaceType, context: SubOperationExecutionContext): SetSyncAtom => {
  const setAtomFunction: SetSyncAtom = <TSource>(
    atom: SyncAtom<TSource> | SyncAtomFamily<TSource, any>,
    setterOrUpdater: SyncAtomSetterOrUpdaterArg<TSource>
  ) => {
    const targetInstance = getOrAddSyncAtomInstance(atom, storePlaceType);
    if (context.type === 'instance effect') {
      operationInEffectInfoEventEmitter.fireTrySetValueToAtom(context.instance, targetInstance, context.effectType);
    } else if (context.type === 'selector get') {
      operationInGetValueInfoEventEmitter.fireTrySetValueToAtom(context.instance, targetInstance);
    }
    changeSyncAtomValue(targetInstance, setterOrUpdater);
  };
  return setAtomFunction;
};

export const buildSetAsyncAtomFunction = (storePlaceType: StorePlaceType, context: SubOperationExecutionContext): SetAsyncAtom => {
  const setAtomFunction: SetAsyncAtom = <TSource>(
    atom: AsyncAtom<TSource> | AsyncAtomFamily<TSource, any>,
    setterOrUpdater: AsyncAtomSetterOrUpdaterArg<TSource>
  ) => {
    const targetInstance = getOrAddAsyncAtomInstance(atom, storePlaceType);
    if (context.type === 'instance effect') {
      operationInEffectInfoEventEmitter.fireTrySetValueToAtom(context.instance, targetInstance, context.effectType);
    } else if (context.type === 'selector get') {
      operationInGetValueInfoEventEmitter.fireTrySetValueToAtom(context.instance, targetInstance);
    }
    changeAsyncAtomValue(targetInstance, setterOrUpdater);
  };
  return setAtomFunction;
};

export const buildResetStoreFunction = (storePlaceType: StorePlaceType, context: SubOperationExecutionContext): ResetStore => {
  const store = getStoreForNewInstance(storePlaceType);
  const resetStoreFunction = () => {
    resetStoreStates(store, false);
    if (context.type === 'instance effect') {
      operationInEffectInfoEventEmitter.fireResetStore(context.instance, store, context.effectType);
    } else if (context.type === 'selector get') {
      operationInGetValueInfoEventEmitter.fireResetStore(context.instance, store);
    }
  };
  return resetStoreFunction;
};

export const buildResetChildStoresFunction = (storePlaceType: StorePlaceType, context: SubOperationExecutionContext): ResetStore => {
  const store = getStoreForNewInstance(storePlaceType);
  const resetChildStoresFunction = () => {
    store.children.map(child => resetStoreStates(child, true));
  };
  if (context.type === 'instance effect') {
    operationInEffectInfoEventEmitter.fireResetChildStores(context.instance, store, context.effectType);
  } else if (context.type === 'selector get') {
    operationInGetValueInfoEventEmitter.fireResetChildStores(context.instance, store);
  }
  return resetChildStoresFunction;
};

export const buildResetStateFunction = (storePlaceType: StorePlaceType, context: SubOperationExecutionContext): ResetState => {
  const resetStatesFunction = <TSource>(state: FiddichState<TSource>): void => {
    const targetInstance = getOrAddStateInstance(state, storePlaceType)!;
    resetState(targetInstance);
    if (context.type === 'instance effect') {
      operationInEffectInfoEventEmitter.fireResetState(context.instance, targetInstance, context.effectType);
    } else if (context.type === 'selector get') {
      operationInGetValueInfoEventEmitter.fireResetState(context.instance, targetInstance);
    }
  };
  return resetStatesFunction;
};

export type GetSnapshot = <TSource>(arg: FiddichState<TSource, any>) => TSource | undefined;
export type SetSyncAtom = <TSource>(arg: SyncAtom<TSource> | SyncAtomFamily<TSource, any>, setterOrUpdater: SyncAtomSetterOrUpdaterArg<TSource>) => void;
export type SetAsyncAtom = <TSource>(arg: AsyncAtom<TSource> | AsyncAtomFamily<TSource, any>, setterOrUpdater: AsyncAtomSetterOrUpdaterArg<TSource>) => void;
export type ResetStore = () => void;
export type ResetChildStores = () => void;
export type ResetState = <TSource>(state: FiddichState<TSource>) => void;

export type BasicOperationArgType = {
  snapshot: GetSnapshot;
  setSyncAtom: SetSyncAtom;
  setAsyncAtom: SetAsyncAtom;
  resetStore: ResetStore;
  resetChildStores: ResetChildStores;
  resetState: ResetState;
};

export type EffectArgBaseType<TCell = any> = BasicOperationArgType & {
  hierarchical: Omit<BasicOperationArgType, 'resetStore' | 'resetChildStores'>;
  root: BasicOperationArgType;
  named: (name: string) => BasicOperationArgType;
  cell: TCell;
};

export type InitEffectArgType<T, TCell = any> = EffectArgBaseType<TCell> & {
  value: T;
};

export type ChangeEffectArgType<T, TCell = any> = EffectArgBaseType<TCell> & {
  newValue: T;
  oldValue: T | undefined;
};

export type ErrorEffectArgType<T, TCell = any> = EffectArgBaseType<TCell> & {
  oldValue: T | undefined;
  error: unknown;
};

export type FinalizeEffectArgType<T, TCell = any> = EffectArgBaseType<TCell> & {
  lastValue: T | undefined;
};

export type EffectsType<T, TCell = any> = {
  init?: (arg: InitEffectArgType<T, TCell>) => void;
  change?: (arg: ChangeEffectArgType<T, TCell>) => void;
  error?: (arg: ErrorEffectArgType<T, TCell>) => void;
  finalize?: (arg: FinalizeEffectArgType<T, TCell>) => void;
};

export type FamilyEffectsTypes<T, P, TCell> = {
  [K in keyof EffectsType<T, TCell>]?: (arg: Parameters<NonNullable<EffectsType<T, TCell>[K]>>[0] & { parameter: P }) => void;
};

export const fireInitEffect = <T>(stateInstance: FiddichStateInstance<T>, initialValue: T) => {
  if (stateInstance.state.effects?.init == null) return;
  stateInstanceInfoEventEmitter.fireEffects(stateInstance, 'init');
  if ('parameter' in stateInstance.state) {
    stateInstance.state.effects.init({
      ...basicEffectsArg(stateInstance, 'init'),
      parameter: stateInstance.state.parameter,
      value: initialValue,
    });
  } else {
    stateInstance.state.effects.init({
      ...basicEffectsArg(stateInstance, 'init'),
      value: initialValue,
    });
  }
};

export const fireChangeEffect = <T>(stateInstance: FiddichStateInstance<T>, oldValue: T | undefined, newValue: T) => {
  if (stateInstance.state.effects?.change == null) return;
  stateInstanceInfoEventEmitter.fireEffects(stateInstance, 'change');
  if ('parameter' in stateInstance.state) {
    stateInstance.state.effects.change({
      ...basicEffectsArg(stateInstance, 'change'),
      parameter: stateInstance.state.parameter,
      oldValue,
      newValue,
    });
  } else {
    stateInstance.state.effects.change({
      ...basicEffectsArg(stateInstance, 'change'),
      oldValue,
      newValue,
    });
  }
};

export const fireErrorEffect = <T>(stateInstance: FiddichStateInstance<T>, oldValue: T | undefined, error: unknown) => {
  if (stateInstance.state.effects?.error == null) return;
  stateInstanceInfoEventEmitter.fireEffects(stateInstance, 'error');
  if ('parameter' in stateInstance.state) {
    stateInstance.state.effects.error({
      ...basicEffectsArg(stateInstance, 'error'),
      parameter: stateInstance.state.parameter,
      error,
      oldValue,
    });
  } else {
    stateInstance.state.effects.error({
      ...basicEffectsArg(stateInstance, 'error'),
      error,
      oldValue,
    });
  }
};

export const fireFinalizeEffect = <T>(stateInstance: FiddichStateInstance<T>) => {
  if (stateInstance.state.effects?.finalize == null) return;
  stateInstanceInfoEventEmitter.fireEffects(stateInstance, 'finalize');
  if ('parameter' in stateInstance.state) {
    stateInstance.state.effects.finalize({
      ...basicEffectsArg(stateInstance, 'finalize'),
      parameter: stateInstance.state.parameter,
      lastValue: getStableValue(stateInstance),
    });
  } else {
    stateInstance.state.effects.finalize({
      ...basicEffectsArg(stateInstance, 'finalize'),
      lastValue: getStableValue(stateInstance),
    });
  }
};

export function effectArgEveryStorePlaceType(
  storePlace: HierarchicalStorePlaceType,
  context: SubOperationExecutionContext
): Omit<BasicOperationArgType, 'resetStore' | 'resetChildStores'>;
export function effectArgEveryStorePlaceType(
  storePlace: Exclude<StorePlaceType, HierarchicalStorePlaceType>,
  context: SubOperationExecutionContext
): BasicOperationArgType;
export function effectArgEveryStorePlaceType(storePlace: StorePlaceType, context: SubOperationExecutionContext) {
  const result = {
    snapshot: lazyFunction(() => buildSnapshotFunction(storePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(storePlace, context)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(storePlace, context)),
    resetState: lazyFunction(() => buildResetStateFunction(storePlace, context)),
  };

  if (storePlace.type !== 'hierarchical') {
    return {
      ...result,
      resetStore: lazyFunction(() => buildResetStoreFunction(storePlace, context)),
      resetChildStores: lazyFunction(() => buildResetChildStoresFunction(storePlace, context)),
    };
  } else {
    return result;
  }
}

export const basicEffectsArg = <T, TCell>(mainInstance: FiddichStateInstance<T, TCell>, effectType: EffectStringType): EffectArgBaseType<TCell> => {
  const normalStorePlace: NormalStorePlaceType = {
    type: 'normal',
    nearestStore: mainInstance.store,
  };
  const rootStorePlace: RootStorePlaceType = { type: 'root', nearestStore: mainInstance.store };
  const hierarchicalStorePlace: HierarchicalStorePlaceType = {
    type: 'hierarchical',
    nearestStore: mainInstance.store,
  };
  const namedStorePlace: (name: string) => NamedStorePlaceType = (name: string) => ({ type: 'named', name });
  const subOperationContext: SubOperationExecutionContext = {
    type: 'instance effect',
    effectType,
    instance: mainInstance,
  };

  return {
    ...effectArgEveryStorePlaceType(normalStorePlace, subOperationContext),
    root: effectArgEveryStorePlaceType(rootStorePlace, subOperationContext),
    hierarchical: effectArgEveryStorePlaceType(hierarchicalStorePlace, subOperationContext),
    named: (name: string) => effectArgEveryStorePlaceType(namedStorePlace(name), subOperationContext),
    cell: mainInstance.cell,
  };
};
