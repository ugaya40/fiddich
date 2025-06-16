import { AtomicContext } from '../atomicContext/index';
import { DependencyState } from '../state';
import { createRecomputeDependent } from './recompute';

export function createGet(context: AtomicContext) {
  const recompute = createRecomputeDependent(context);
  
  const get = <T>(state: DependencyState<T>): T => {
    const targetCopy = context.copyStore.getCopy(state);
    
    if (targetCopy.kind === 'computed') {
      if (context.valueDirty.has(targetCopy)) {
        recompute(targetCopy);
        context.valueDirty.delete(targetCopy);
      }
    }
    
    return targetCopy.value;
  };
  
  return get;
}