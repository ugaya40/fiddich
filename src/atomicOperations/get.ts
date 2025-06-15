import { AtomicContext } from '../atomicContext';
import { DependencyState } from '../state';

export function createGet(context: AtomicContext) {
  const { copyStore } = context;
  
  return <T>(state: DependencyState<T>): T => {
    // Initialize if needed
    if (state.kind === 'computed' && state.isInitialized === false) {
      const dependencies = new Set<DependencyState>();
      
      const getter = <V>(target: DependencyState<V>): V => {
        dependencies.add(target);
        const targetCopy = copyStore.getCopy(target);
        return targetCopy.value;
      };
      
      // Compute initial value
      state.stableValue = state.compute(getter);
      
      // Register dependencies
      state.dependencies = dependencies;
      for (const dep of dependencies) {
        dep.dependents.add(state);
      }
      
      state.isInitialized = true;
    }
    
    const targetCopy = copyStore.getCopy(state);
    return targetCopy.value;
  };
}