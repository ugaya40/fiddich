import { AtomInstance } from './atom/atom';
import { SelectorInstance } from './selector/selector';
import { FiddichStateInstance, InstanceEventArgs, Store } from './shareTypes';
import { eventPublisher } from './util/event';

type StoreInfo = {
  storeType: 'FiddichRoot' | 'SubFiddichRoot' | 'NamedStore';
  store: Store;
};

export type StoreInfoEventArg =
  | {
      type: 'store created';
      storeInfo: StoreInfo;
    }
  | {
      type: 'store finalized';
      storeInfo: StoreInfo;
    };

type AtomInstanceInfo = {
  instance: AtomInstance<any>;
  storeInfo: StoreInfo;
};

type SelectorInstanceInfo = {
  instance: SelectorInstance<any>;
  storeInfo: StoreInfo;
};

type StateInstanceInfo = {
  instance: FiddichStateInstance;
  storeInfo: StoreInfo;
};

export type StateInstanceInfoEventArg =
  | {
      type: 'state instance created';
      instanceInfo: StateInstanceInfo;
    }
  | {
      type: 'state instance event fired';
      instanceInfo: StateInstanceInfo;
      event: InstanceEventArgs;
    }
  | {
      type: 'state instance registered';
      instanceInfo: StateInstanceInfo;
    };

export type SelectorInfoEventArg = {
  type: 'selector instance try getValue';
  instanceInfo: SelectorInstanceInfo;
  reason:
    | { type: 'initialize' }
    | {
        type: 'source instance changed';
        sourceInstanceInfo: StateInstanceInfo;
      };
};

export type EffectStringType = 'init' | 'change' | 'error' | 'finalize';

export type EffectInfoEventArg = {
  type: 'state instance effect';
  effectType: EffectStringType;
  instanceInfo: StateInstanceInfo;
};

export type SetAtomOperationInfoEventArg = {
  type: 'atom instance try setValue';
  source:
    | {
        type: 'setAtom hooks';
        componentName: string | undefined;
      }
    | {
        type: 'instance effect';
        effectType: EffectStringType;
        instanceInfo: StateInstanceInfo;
      }
    | {
        type: 'selector get';
        selectorInfo: SelectorInstanceInfo;
      };
  targetAtomInstanceInfo: AtomInstanceInfo;
};

export type ResetStoreOperationInfoEventArg = {
  type: 'reset store';
  source:
    | {
        type: 'useStore';
        componentName: string | undefined;
      }
    | {
        type: 'instance effect';
        effectType: EffectStringType;
        instanceInfo: StateInstanceInfo;
      }
    | {
        type: 'selector get';
        selectorInfo: SelectorInstanceInfo;
      }
    | {
        type: 'named store operator';
        store: StoreInfo;
      };
  targetStore: StoreInfo;
};

export type ResetChildStoresOperationInfoEventArg = {
  type: 'reset child stores';
  source:
    | {
        type: 'useStore';
        componentName: string | undefined;
      }
    | {
        type: 'instance effect';
        effectType: EffectStringType;
        instanceInfo: StateInstanceInfo;
      }
    | {
        type: 'selector get';
        selectorInfo: SelectorInstanceInfo;
      };
  rootStore: StoreInfo;
};

export type ResetStateOperationInfoEventArg = {
  type: 'reset state';
  source:
    | {
        type: 'instance effect';
        effectType: EffectStringType;
        instanceInfo: StateInstanceInfo;
      }
    | {
        type: 'selector get';
        selectorInfo: SelectorInstanceInfo;
      }
    | {
        type: 'named store operator';
        store: StoreInfo;
      }
    | {
        type: 'useResetState';
        componentName: string | undefined;
      };
  targetInstance: StateInstanceInfo;
};

export type UseValueInfoEventArg =
  | {
      type: 'useValue request rerender';
      componentName: string | undefined;
      instanceInfo: StateInstanceInfo;
      reason: 'change' | 'change by promise' | 'reset' | 'initialized' | 'waiting' | 'error';
    }
  | {
      type: 'useValue return value';
      componentName: string | undefined;
      instanceInfo: StateInstanceInfo;
      value: any;
    }
  | {
      type: 'useValue throw error';
      componentName: string | undefined;
      instanceInfo: StateInstanceInfo;
      error: any;
    }
  | {
      type: 'useValue throw promise';
      componentName: string | undefined;
      instanceInfo: StateInstanceInfo;
      promise: Promise<any>;
    };

export type InfoEventArgs =
  | StoreInfoEventArg
  | StateInstanceInfoEventArg
  | EffectInfoEventArg
  | SetAtomOperationInfoEventArg
  | ResetStateOperationInfoEventArg
  | ResetStoreOperationInfoEventArg
  | ResetChildStoresOperationInfoEventArg
  | SelectorInfoEventArg
  | UseValueInfoEventArg;

const storeInfo = (store: Store): StoreInfo => {
  if ('parent' in store) {
    return {
      store,
      storeType: 'SubFiddichRoot',
    };
  } else if (store.name != null) {
    return {
      store,
      storeType: 'NamedStore',
    };
  } else {
    return {
      store,
      storeType: 'FiddichRoot',
    };
  }
};

function instanceInfo(instance: SelectorInstance<any, any>): SelectorInstanceInfo;
function instanceInfo(instance: AtomInstance<any, any>): AtomInstanceInfo;
function instanceInfo(instance: FiddichStateInstance<any, any>): StateInstanceInfo;
function instanceInfo(instance: FiddichStateInstance<any, any>): StateInstanceInfo {
  return {
    instance,
    storeInfo: storeInfo(instance.store),
  };
}

export const globalFiddichEvent = eventPublisher<InfoEventArgs>();

export const storeInfoEventEmitter = {
  fireStoreCreated: (store: Store) => globalFiddichEvent.emit({ type: 'store created', storeInfo: storeInfo(store) }),
  fireStoreDestroyed: (store: Store) => globalFiddichEvent.emit({ type: 'store finalized', storeInfo: storeInfo(store) }),
};

export const instanceInfoEventEmitter = {
  fireInstanceCreated: (instance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({ type: 'state instance created', instanceInfo: instanceInfo(instance) }),
  fireInstanceEventFired: (instance: FiddichStateInstance<any>, event: InstanceEventArgs) =>
    globalFiddichEvent.emit({ type: 'state instance event fired', instanceInfo: instanceInfo(instance), event }),
  fireInstanceRegistered: (instance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({ type: 'state instance registered', instanceInfo: instanceInfo(instance) }),
};

export const useSetAtomInfoEventEmitter = {
  fireTrySetValue: (componentName: string | undefined, instance: AtomInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'atom instance try setValue',
      source: { type: 'setAtom hooks', componentName },
      targetAtomInstanceInfo: instanceInfo(instance),
    }),
};

export const useStoreInfoEventEmitter = {
  fireResetStore: (componentName: string | undefined, targetStore: Store) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'useStore', componentName },
      targetStore: storeInfo(targetStore),
    }),
  fireResetChildStores: (componentName: string | undefined, rootStore: Store) =>
    globalFiddichEvent.emit({
      type: 'reset child stores',
      source: { type: 'useStore', componentName },
      rootStore: storeInfo(rootStore),
    }),
};

export const operationInEffectInfoEventEmitter = {
  fireTrySetValueToAtom: (instance: FiddichStateInstance<any>, targetInstance: AtomInstance<any>, effectType: EffectStringType) =>
    globalFiddichEvent.emit({
      type: 'atom instance try setValue',
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      targetAtomInstanceInfo: instanceInfo(targetInstance),
    }),
  fireResetStore: (instance: FiddichStateInstance<any>, targetStore: Store, effectType: EffectStringType) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      targetStore: storeInfo(targetStore),
    }),
  fireResetChildStores: (instance: FiddichStateInstance<any>, rootStore: Store, effectType: EffectStringType) =>
    globalFiddichEvent.emit({
      type: 'reset child stores',
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      rootStore: storeInfo(rootStore),
    }),
  fireResetState: (instance: FiddichStateInstance<any>, targetInstance: FiddichStateInstance<any>, effectType: EffectStringType) =>
    globalFiddichEvent.emit({
      type: 'reset state',
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      targetInstance: instanceInfo(targetInstance),
    }),
};

export const operationInGetValueInfoEventEmitter = {
  fireTrySetValueToAtom: (instance: SelectorInstance<any>, targetInstance: AtomInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'atom instance try setValue',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      targetAtomInstanceInfo: instanceInfo(targetInstance),
    }),
  fireResetStore: (instance: SelectorInstance<any>, targetStore: Store) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      targetStore: storeInfo(targetStore),
    }),
  fireResetChildStores: (instance: SelectorInstance<any>, rootStore: Store) =>
    globalFiddichEvent.emit({
      type: 'reset child stores',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      rootStore: storeInfo(rootStore),
    }),
  fireResetState: (instance: SelectorInstance<any>, targetInstance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'reset state',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      targetInstance: instanceInfo(targetInstance),
    }),
};

export const stateInstanceInfoEventEmitter = {
  fireEffects: (instance: FiddichStateInstance<any>, effectType: EffectStringType) =>
    globalFiddichEvent.emit({ type: 'state instance effect', effectType, instanceInfo: instanceInfo(instance) }),
};

export const selectorInstanceInfoEventEmitter = {
  fireTryGetValueWhenInitialize: (instance: SelectorInstance<any>) =>
    globalFiddichEvent.emit({ type: 'selector instance try getValue', reason: { type: 'initialize' }, instanceInfo: instanceInfo(instance) }),

  fireTryGetValueWhenSourceChanged: (instance: SelectorInstance<any>, sourceInstance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'selector instance try getValue',
      reason: {
        type: 'source instance changed',
        sourceInstanceInfo: instanceInfo(sourceInstance),
      },
      instanceInfo: instanceInfo(instance),
    }),
};

export type RequestRerenderReason = 'change' | 'change by promise' | 'reset' | 'initialized' | 'waiting' | 'error';

export const useValueInfoEventEmitter = {
  fireRequestRerender: (componentName: string | undefined, instance: FiddichStateInstance<any>, reason: RequestRerenderReason) =>
    globalFiddichEvent.emit({ type: 'useValue request rerender', componentName, instanceInfo: instanceInfo(instance), reason }),
  fireReturnValue: (componentName: string | undefined, instance: FiddichStateInstance<any>, value: any) =>
    globalFiddichEvent.emit({ type: 'useValue return value', componentName, instanceInfo: instanceInfo(instance), value }),
  fireThrowError: (componentName: string | undefined, instance: FiddichStateInstance<any>, error: any) =>
    globalFiddichEvent.emit({ type: 'useValue throw error', componentName, instanceInfo: instanceInfo(instance), error }),
  fireThrowPromise: (componentName: string | undefined, instance: FiddichStateInstance<any>, promise: Promise<any>) =>
    globalFiddichEvent.emit({ type: 'useValue throw promise', componentName, instanceInfo: instanceInfo(instance), promise }),
};

export const useResetStateInfoEventEmitter = {
  fireResetState: (componentName: string | undefined, instance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({ type: 'reset state', source: { type: 'useResetState', componentName }, targetInstance: instanceInfo(instance) }),
};

export const namedStoreOperatorInfoEventEmitter = {
  fireResetStore: (targetStore: Store) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'named store operator', store: storeInfo(targetStore) },
      targetStore: storeInfo(targetStore),
    }),
  fireResetState: (store: Store, targetInstance: FiddichStateInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'reset state',
      source: { type: 'named store operator', store: storeInfo(store) },
      targetInstance: instanceInfo(targetInstance),
    }),
};
