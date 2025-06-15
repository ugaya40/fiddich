import { AtomicContext } from '../atomicContext';
import { DependencyState } from '../state';
import { createRecomputeDependent } from './recompute';
import { withCircularDetection } from '../circularDetection';

export function createGet(context: AtomicContext) {
  const { copyStore, valueDirty } = context;
  const recompute = createRecomputeDependent(context);
  
  const get = <T>(state: DependencyState<T>): T => {
    // Initialize if needed
    if (state.kind === 'computed' && state.isInitialized === false) {
      withCircularDetection(state, () => {
        const dependencies = new Set<DependencyState>();
        
        const getter = <V>(target: DependencyState<V>): V => {
          dependencies.add(target);
          // Recursively call get to handle uninitialized dependencies
          return get(target);
        };
        
        // Compute initial value
        state.stableValue = state.compute(getter);
        
        // Register dependencies
        state.dependencies = dependencies;
        for (const dep of dependencies) {
          dep.dependents.add(state);
        }
        
        state.isInitialized = true;
        return state.stableValue;
      });
    }
    
    const targetCopy = copyStore.getCopy(state);
    
    // Recompute if dirty
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