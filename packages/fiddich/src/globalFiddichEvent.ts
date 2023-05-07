import { AtomInstance } from './atom';
import { SelectorInstance } from './selector';
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
  instance: FiddichStateInstance<any>;
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
      };
  targetStore: StoreInfo;
  isRecursive: boolean;
};

export type UseValueInfoEventArg =
  | {
      type: 'useValue request rerender';
      componentName: string | undefined;
      instanceInfo: StateInstanceInfo;
      reason: 'change' | 'change by promise' | 'reset' | 'waiting' | 'error';
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
  | ResetStoreOperationInfoEventArg
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

function instanceInfo(instance: SelectorInstance<any>): SelectorInstanceInfo;
function instanceInfo(instance: AtomInstance<any>): AtomInstanceInfo;
function instanceInfo(instance: FiddichStateInstance): StateInstanceInfo;
function instanceInfo(instance: FiddichStateInstance): StateInstanceInfo {
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
  fireInstanceCreated: (instance: FiddichStateInstance) => globalFiddichEvent.emit({ type: 'state instance created', instanceInfo: instanceInfo(instance) }),
  fireInstanceEventFired: (instance: FiddichStateInstance, event: InstanceEventArgs) =>
    globalFiddichEvent.emit({ type: 'state instance event fired', instanceInfo: instanceInfo(instance), event }),
  fireInstanceRegistered: (instance: FiddichStateInstance) =>
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
  fireResetStates: (componentName: string | undefined, targetStore: Store, isRecursive: boolean) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'useStore', componentName },
      isRecursive,
      targetStore: storeInfo(targetStore),
    }),
};

export const operationInEffectInfoEventEmitter = {
  fireTrySetValueToAtom: (instance: FiddichStateInstance<any>, targetInstance: AtomInstance<any>, effectType: EffectStringType) =>
    globalFiddichEvent.emit({
      type: 'atom instance try setValue',
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      targetAtomInstanceInfo: instanceInfo(targetInstance),
    }),
  fireResetStates: (instance: FiddichStateInstance<any>, targetStore: Store, effectType: EffectStringType, isRecursive: boolean) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      isRecursive,
      source: { type: 'instance effect', instanceInfo: instanceInfo(instance), effectType },
      targetStore: storeInfo(targetStore),
    }),
};

export const operationInGetValueInfoEventEmitter = {
  fireTrySetValueToAtom: (instance: SelectorInstance<any>, targetInstance: AtomInstance<any>) =>
    globalFiddichEvent.emit({
      type: 'atom instance try setValue',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      targetAtomInstanceInfo: instanceInfo(targetInstance),
    }),
  fireResetStates: (instance: SelectorInstance<any>, targetStore: Store, isRecursive: boolean) =>
    globalFiddichEvent.emit({
      type: 'reset store',
      source: { type: 'selector get', selectorInfo: instanceInfo(instance) },
      targetStore: storeInfo(targetStore),
      isRecursive,
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

export type RequestRerenderReason = 'change' | 'change by promise' | 'reset' | 'waiting' | 'error';

export const useValueInfoEventEmitter = {
  fireRequestRerender: (componentName: string | undefined, instance: FiddichStateInstance, reason: RequestRerenderReason) =>
    globalFiddichEvent.emit({ type: 'useValue request rerender', componentName, instanceInfo: instanceInfo(instance), reason }),
  fireReturnValue: (componentName: string | undefined, instance: FiddichStateInstance, value: any) =>
    globalFiddichEvent.emit({ type: 'useValue return value', componentName, instanceInfo: instanceInfo(instance), value }),
  fireThrowError: (componentName: string | undefined, instance: FiddichStateInstance, error: any) =>
    globalFiddichEvent.emit({ type: 'useValue throw error', componentName, instanceInfo: instanceInfo(instance), error }),
  fireThrowPromise: (componentName: string | undefined, instance: FiddichStateInstance, promise: Promise<any>) =>
    globalFiddichEvent.emit({ type: 'useValue throw promise', componentName, instanceInfo: instanceInfo(instance), promise }),
};
