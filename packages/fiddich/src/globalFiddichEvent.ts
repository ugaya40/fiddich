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
      type: 'store destroyed';
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

export type AtomInfoEventArg = {
  type: 'atom instance try setValue';
  instanceInfo: AtomInstanceInfo;
};

export type SelectorInfoEventArg = {
  type: 'selector instance try getValue';
  instanceInfo: SelectorInstanceInfo;
};

export type UseValueInfoEventArg =
  | {
      type: 'request rerender';
      instanceInfo: StateInstanceInfo;
      reason: 'change' | 'change by promise' | 'reset' | 'waiting' | 'error';
    }
  | {
      type: 'return value';
      instanceInfo: StateInstanceInfo;
      value: any;
    }
  | {
      type: 'throw error';
      instanceInfo: StateInstanceInfo;
      error: any;
    }
  | {
      type: 'throw promise';
      instanceInfo: StateInstanceInfo;
      promise: Promise<any>;
    };

export type InfoEventArgs = StoreInfoEventArg | StateInstanceInfoEventArg | AtomInfoEventArg | SelectorInfoEventArg | UseValueInfoEventArg;

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
  fireStoreDestroyed: (store: Store) => globalFiddichEvent.emit({ type: 'store destroyed', storeInfo: storeInfo(store) }),
};

export const instanceInfoEventEmitter = {
  fireInstanceCreated: (instance: FiddichStateInstance) => globalFiddichEvent.emit({ type: 'state instance created', instanceInfo: instanceInfo(instance) }),
  fireInstanceEventFired: (instance: FiddichStateInstance, event: InstanceEventArgs) =>
    globalFiddichEvent.emit({ type: 'state instance event fired', instanceInfo: instanceInfo(instance), event }),
  fireInstanceRegistered: (instance: FiddichStateInstance) =>
    globalFiddichEvent.emit({ type: 'state instance registered', instanceInfo: instanceInfo(instance) }),
};

export const atomInstanceInfoEventEmitter = {
  fireTrySetValue: (instance: AtomInstance<any>) => globalFiddichEvent.emit({ type: 'atom instance try setValue', instanceInfo: instanceInfo(instance) }),
};

export const selectorInstanceInfoEventEmitter = {
  fireTryGetValue: (instance: SelectorInstance<any>) =>
    globalFiddichEvent.emit({ type: 'selector instance try getValue', instanceInfo: instanceInfo(instance) }),
};

export const useValueInfoEventEmitter = {
  fireRequestRerender: (instance: FiddichStateInstance, reason: 'change' | 'change by promise' | 'reset' | 'waiting' | 'error') =>
    globalFiddichEvent.emit({ type: 'request rerender', instanceInfo: instanceInfo(instance), reason }),
  fireReturnValue: (instance: FiddichStateInstance, value: any) =>
    globalFiddichEvent.emit({ type: 'return value', instanceInfo: instanceInfo(instance), value }),
  fireThrowError: (instance: FiddichStateInstance, error: any) => globalFiddichEvent.emit({ type: 'throw error', instanceInfo: instanceInfo(instance), error }),
  fireThrowPromise: (instance: FiddichStateInstance, promise: Promise<any>) =>
    globalFiddichEvent.emit({ type: 'throw promise', instanceInfo: instanceInfo(instance), promise }),
};
