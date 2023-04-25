import {
  AsyncAtom,
  AsyncAtomFamily,
  AsyncAtomSetterOrUpdaterArg,
  AtomInstance,
  SyncAtom,
  SyncAtomFamily,
  SyncAtomSetterOrUpdaterArg,
  changeAsyncAtomValue,
  changeSyncAtomValue,
  getOrAddAsyncAtomInstance,
  getOrAddSyncAtomInstance,
  resetAtom,
} from '../atom';
import { getNamedStore } from '../namedStore';
import { SelectorInstance, getOrAddAsyncSelectorInstance, getOrAddSyncSelectorInstance, resetSelector } from '../selector';
import {
  ContextStorePlaceType,
  FiddichState,
  FiddichStateInstance,
  HierarchicalStorePlaceType,
  NamedStorePlaceType,
  NormalStorePlaceType,
  RootStorePlaceType,
  Store,
  StorePlaceType,
} from '../shareTypes';
import { invalidStatusErrorText, nameAndGlobalNamedStoreMap } from './const';
import { getContextStore, getRootStore } from './storeUtil';
import { lazyFunction } from './util';

export type NotFunction<T> = T extends Function ? never : T;

type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends T ? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, undefined>> : never;
export type StrictUnion<T> = StrictUnionHelper<T, T>;

export function getValue<T>(instance: FiddichStateInstance<T>): T | Promise<T> {
  const status = instance.status;
  if (status.type === 'stable') {
    return status.value;
  } else if ('abortRequest' in status) {
    return new Promise<T>(async (resolve, reject) => {
      await status.promise;
      const newStatus = instance.status;
      if (newStatus.type === 'stable') {
        resolve(newStatus.value);
      } else if (newStatus.type === 'error') {
        reject(newStatus.error);
      } else {
        resolve(getValue(instance));
      }
    });
  } else if (status.type === 'error') {
    throw status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
}

export const getStableValue = <T>(instance: FiddichStateInstance<T>) => {
  const status = instance.status;
  if (status.type === 'error' || status.type === 'unknown' || status.type === 'waiting for initialize') return undefined;
  return status.type === 'stable' ? status.value : status.oldValue;
};

export function getFiddichInstance<T = unknown>(state: FiddichState<T>, storePlaceType: StorePlaceType): FiddichStateInstance<T> | undefined {
  if (storePlaceType.type === 'named') {
    const store = nameAndGlobalNamedStoreMap.get(storePlaceType.name)!;
    return store.map.get(state.key);
  } else if (storePlaceType.type === 'root') {
    return getRootStore(storePlaceType.nearestStore).map.get(state.key);
  } else if (storePlaceType.type === 'context') {
    if (storePlaceType.nearestStore.contextKey === storePlaceType.key) {
      return storePlaceType.nearestStore.map.get(state.key);
    } else {
      if ('parent' in storePlaceType.nearestStore) {
        return getFiddichInstance(state, {
          type: storePlaceType.type,
          nearestStore: storePlaceType.nearestStore.parent,
          key: storePlaceType.key,
        });
      } else {
        return undefined;
      }
    }
  } else {
    const nearestStoreResult = storePlaceType.nearestStore.map.get(state.key);

    if (nearestStoreResult != null) {
      return nearestStoreResult;
    }

    if (storePlaceType.type === 'hierarchical') {
      if ('parent' in storePlaceType.nearestStore) {
        return getFiddichInstance(state, {
          type: storePlaceType.type,
          nearestStore: storePlaceType.nearestStore.parent,
        });
      }
    }
  }

  return undefined;
}

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

function resetStoreStatesInternal(store: Store, doneList: Store[], recursive: boolean) {
  store.map.forEach(value => {
    if (value.state.type === 'atom' || value.state.type === 'atomFamily') {
      resetAtom(value as AtomInstance<unknown>);
    } else {
      resetSelector(value as SelectorInstance<unknown>);
    }
  });
  doneList.push(store);

  if (recursive) {
    store.children.forEach(child => resetStoreStatesInternal(child, doneList, recursive));
  }
}

export function resetStoreStates(store: Store, recursive: boolean) {
  if (recursive) {
    const doneList: Store[] = [];
    resetStoreStatesInternal(store, doneList, true);
  } else {
    resetStoreStatesInternal(store, [], false);
  }
}

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
      return undefined;
    } else {
      throw new Error(invalidStatusErrorText);
    }
  };
  return snapshotFunction;
};

export const buildSetSyncAtomFunction = (storePlaceType: StorePlaceType): SetSyncAtom => {
  const setAtomFunction: SetSyncAtom = <TSource>(
    atom: SyncAtom<TSource> | SyncAtomFamily<TSource, any>,
    setterOrUpdater: SyncAtomSetterOrUpdaterArg<TSource>
  ) => {
    const targetInstance = getOrAddSyncAtomInstance(atom, storePlaceType);
    changeSyncAtomValue(targetInstance, setterOrUpdater);
  };
  return setAtomFunction;
};

export const buildSetAsyncAtomFunction = (storePlaceType: StorePlaceType): SetAsyncAtom => {
  const setAtomFunction: SetAsyncAtom = <TSource>(
    atom: AsyncAtom<TSource> | AsyncAtomFamily<TSource, any>,
    setterOrUpdater: AsyncAtomSetterOrUpdaterArg<TSource>
  ) => {
    const targetInstance = getOrAddAsyncAtomInstance(atom, storePlaceType);
    changeAsyncAtomValue(targetInstance, setterOrUpdater);
  };
  return setAtomFunction;
};

export type GetSnapshot = <TSource>(arg: FiddichState<TSource>) => TSource | undefined;
export type SetSyncAtom = <TSource>(arg: SyncAtom<TSource> | SyncAtomFamily<TSource, any>, setterOrUpdater: SyncAtomSetterOrUpdaterArg<TSource>) => void;
export type SetAsyncAtom = <TSource>(arg: AsyncAtom<TSource> | AsyncAtomFamily<TSource, any>, setterOrUpdater: AsyncAtomSetterOrUpdaterArg<TSource>) => void;
export type ResetStates = (recursive: boolean) => void;

export type EffectArgTypeBase = {
  snapshot: GetSnapshot;
  setSyncAtom: SetSyncAtom;
  setAsyncAtom: SetAsyncAtom;
  resetStates: ResetStates;
  hierarchical: { snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom };
  root: { snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom; resetStates: ResetStates };
  named: (name: string) => { snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom; resetStates: ResetStates };
  context: (name: string) => { snapshot: GetSnapshot; setSyncAtom: SetSyncAtom; setAsyncAtom: SetAsyncAtom; resetStates: ResetStates };
};

export type InitEffectArgType<T> = EffectArgTypeBase & {
  value: T;
};

export type ChangeEffectArgType<T> = EffectArgTypeBase & {
  newValue: T;
  oldValue: T | undefined;
};

export type ErrorEffectArgType<T> = EffectArgTypeBase & {
  oldValue: T | undefined;
  error: unknown;
};

export type DestroyEffectArgType<T> = EffectArgTypeBase & {
  lastValue: T | undefined;
};

export type EffectsType<T> = {
  init?: (arg: InitEffectArgType<T>) => void;
  change?: (arg: ChangeEffectArgType<T>) => void;
  error?: (arg: ErrorEffectArgType<T>) => void;
  destroy?: (arg: DestroyEffectArgType<T>) => void;
};

export const effectsArgBase = <T>(nearestStore: Store): EffectArgTypeBase => {
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
    snapshot: lazyFunction(() => buildSnapshotFunction(normalStorePlace)),
    setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(normalStorePlace)),
    setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(normalStorePlace)),
    resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(nearestStore, recursive)),
    root: {
      snapshot: lazyFunction(() => buildSnapshotFunction(rootStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(rootStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(rootStorePlace)),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getRootStore(nearestStore), recursive)),
    },
    hierarchical: {
      snapshot: lazyFunction(() => buildSnapshotFunction(hierarchicalStorePlace)),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(hierarchicalStorePlace)),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(hierarchicalStorePlace)),
    },
    named: (name: string) => ({
      snapshot: lazyFunction(() => buildSnapshotFunction(namedStorePlace(name))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(namedStorePlace(name))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(namedStorePlace(name))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getNamedStore(name), recursive)),
    }),
    context: (key: string) => ({
      snapshot: lazyFunction(() => buildSnapshotFunction(contextStorePlace(key))),
      setSyncAtom: lazyFunction(() => buildSetSyncAtomFunction(contextStorePlace(key))),
      setAsyncAtom: lazyFunction(() => buildSetAsyncAtomFunction(contextStorePlace(key))),
      resetStates: lazyFunction(() => (recursive: boolean) => resetStoreStates(getContextStore(key, nearestStore), recursive)),
    }),
  };
};

export class StateInstanceError extends Error {
  state: FiddichState<any>;

  constructor(public instance: FiddichStateInstance<any>, public originalError: Error) {
    super();
    this.name = 'StateInstanceError';
    this.state = instance.state;
    const storeDisplayName =
      'name' in instance.store && instance.store.name != null
        ? `StoreName: "${instance.store.name}"`
        : 'contextKey' in instance.store && instance.store.contextKey != null
        ? `ContextKey: "${instance.store.contextKey}"`
        : `StoreId: "${instance.store.id}"`;
    this.message = `${storeDisplayName} StateName: "${instance.state.name ?? 'anonymous'}"(${instance.state.key}`;
    this.stack = `${this.stack}
     ------ Original Error ------
     ${this.originalError.message}
     ${this.originalError.stack}`;
  }
}
