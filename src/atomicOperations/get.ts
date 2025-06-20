import { AtomicContext } from '../atomicContext/index';
import { State } from '../state';
import { isComputedCopy } from '../stateUtil';
import { createRecomputeComputed } from './recompute';

export function createGet(context: AtomicContext) {
  const recompute = createRecomputeComputed(context);
  
  const get = <T>(state: State<T>): T => {
    const targetCopy = context.copyStore.getCopy(state);
    
    if (isComputedCopy(targetCopy)) {
      if (context.valueDirty.has(targetCopy)) {
        recompute(targetCopy);
        context.valueDirty.delete(targetCopy);
      }
    }
    
    return targetCopy.value;
  };
  
  return get;
}