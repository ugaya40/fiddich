import { Computed, DependencyState } from './state';
import { withCircularDetection } from './circularDetection';
import { get } from './get';

export function initializeComputedState<T>(state: Computed<T>): void {
  initializeComputedStateWithGetter(state, get);
}

export function initializeComputedStateWithGetter<T>(
  state: Computed<T>,
  getFunction: <V>(state: DependencyState<V>) => V
): void {
  if (state.isInitialized) return;
  
  withCircularDetection(state, () => {
    const dependencies = new Set<DependencyState>();
    
    const getter = <V>(target: DependencyState<V>): V => {
      dependencies.add(target);
      return getFunction(target);
    };
    
    state.stableValue = state.compute(getter);
    
    state.dependencies = dependencies;
    for (const dep of dependencies) {
      dep.dependents.add(state);
    }
    
    state.isInitialized = true;
    
    if (state.changeCallback) {
      state.changeCallback(state.stableValue, state.stableValue);
    }
    
    return state.stableValue;
  });
}