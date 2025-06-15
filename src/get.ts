import { DependencyState, DependentState } from './state';

export function get<T>(state: DependencyState<T>): T {
  // Initialize if needed
  if (state.kind === 'computed' && state.isInitialized === false) {
    const dependencies = new Set<DependencyState>();
    
    const getter = <V>(target: DependencyState<V>): V => {
      dependencies.add(target);
      return get(target); // Recursive call to handle nested uninitialized computeds
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
  
  return state.stableValue;
}

// Internal function for initializing LeafComputed
export function initializeLeafComputed<T>(state: DependentState<T>): void {
  if (state.kind === 'leafComputed' && state.isInitialized === false) {
    const dependencies = new Set<DependencyState>();
    
    const getter = <V>(target: DependencyState<V>): V => {
      dependencies.add(target);
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
  }
}