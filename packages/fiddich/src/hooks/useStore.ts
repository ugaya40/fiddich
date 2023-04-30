import { useContext, useMemo } from 'react';
import { Store } from '../shareTypes';
import { FiddichStoreContext, noStoreErrorText } from '../util/const';
import { resetStoreStates } from '../util/stateUtil';
import { getContextStore, getRootStore } from '../util/storeUtil';

type StoreOperatorForReset = {
  store: Store;
  resetStates: (recursive: boolean) => void;
};

function useStoreOperator(store: Store): StoreOperatorForReset {
  return useMemo(() => {
    return {
      store,
      resetStates: (recursive: boolean) => resetStoreStates(store, recursive),
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