import { useContext, useMemo } from 'react';
import { FiddichState, StorePlaceType } from '../shareTypes';
import { FiddichStoreContext, noStoreErrorText } from '../util/const';
import { useResetStateInfoEventEmitter } from '../globalFiddichEvent';
import { useComponentNameIfDev } from './useComponentNameIfDev';
import { resetState } from '../stateUtil/reset';
import { useInstance } from './useInstance';

export function useResetState(state: FiddichState, storePlace?: StorePlaceType): () => void {
  const componentName = useComponentNameIfDev();
  const instance = useInstance(state, storePlace ?? { type: 'normal' });
  return useMemo(() => {
    return () => {
      resetState(instance);
      useResetStateInfoEventEmitter.fireResetState(componentName, instance);
    };
  }, [instance]);
}

export function useRootResetState(state: FiddichState): () => void {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  return useResetState(state, { type: 'root', nearestStore: store });
}

export function useHierarchicalResetState(state: FiddichState): () => void {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  return useResetState(state, { type: 'hierarchical', nearestStore: store });
}

export function useContextResetState(state: FiddichState, contextKey: string): () => void {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);
  return useResetState(state, { type: 'context', key: contextKey, nearestStore: store });
}

export function useNamedResetState(state: FiddichState, name: string): () => void {
  return useResetState(state, { type: 'named', name });
}
