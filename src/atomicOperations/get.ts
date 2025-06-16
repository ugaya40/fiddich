import { AtomicContext } from '../atomicContext';
import { DependencyState } from '../state';
import { createRecomputeDependent } from './recompute';
import { initializeComputedStateWithGetter } from '../stateUtil';

export function createGet(context: AtomicContext) {
  const { copyStore, valueDirty } = context;
  const recompute = createRecomputeDependent(context);
  
  const get = <T>(state: DependencyState<T>): T => {
    if (state.kind === 'computed' && !state.isInitialized) {
      initializeComputedStateWithGetter(state, get);
    }
    
    const targetCopy = copyStore.getCopy(state);
    
    if (targetCopy.kind === 'computed') {
      if (valueDirty.has(targetCopy)) {
        recompute(targetCopy);
        valueDirty.delete(targetCopy);
      }
    }
    
    return targetCopy.value;
  };
  
  return get;
}