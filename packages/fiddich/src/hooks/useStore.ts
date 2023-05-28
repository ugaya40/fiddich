import { useContext, useMemo } from 'react';
import { Store } from '../shareTypes';
import { FiddichStoreContext, noStoreErrorText } from '../util/const';
import { getContextStore, getRootStore } from '../util/storeUtil';
import { useStoreInfoEventEmitter } from '../globalFiddichEvent';
import { useComponentNameIfDev } from './useComponentNameIfDev';
import { ResetStore } from '../stateUtil/instanceOperation';
import { resetStoreStates } from '../stateUtil/reset';
import { getNamedStore } from '../namedStore';

type StoreOperatorForReset = {
  store: Store;
  reset: ResetStore;
};

function useStoreOperator(store: Store): StoreOperatorForReset {
  const componentName = useComponentNameIfDev();
  return useMemo(() => {
    return {
      store,
      reset: (resetChildStores?: boolean) => {
        resetStoreStates(store, resetChildStores ?? false);
        useStoreInfoEventEmitter.fireResetStore(componentName, store);
      },
    };
  }, [store.id]);
}

export function useNearestStore(): StoreOperatorForReset {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  return useStoreOperator(store);
}

export function useRootStore(): StoreOperatorForReset {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  const rootStore = getRootStore(store);
  return useStoreOperator(rootStore);
}

export function useContextStore(contextKey: string): StoreOperatorForReset {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  const contextStore = getContextStore(contextKey, store);
  return useStoreOperator(contextStore);
}

export function useNamedStore(name: string): StoreOperatorForReset {
  const namedStore = getNamedStore(name);
  return useStoreOperator(namedStore);
}
