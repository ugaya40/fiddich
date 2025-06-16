import { Computed, DependentState, DependencyState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';
import { get } from './get';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T>; onChange?: (prev: T, next: T) => void }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue: undefined as any,
    dependents: new Set<DependentState>(),
    dependencies: new Set<DependencyState>(),
    isInitialized: false,
    
    compute(getter: <V>(target: DependencyState<V>) => V): T {
      const result = fn({ get: getter });
      return result;
    },
    
    compare,
    
    changeCallback: options?.onChange,
    
    [Symbol.dispose](): void {
      for (const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();
      
      current.dependents.clear();
    },

    toJSON(): T {
      if (!current.isInitialized) {
        get(current);
      }
      return current.stableValue;
    },

    dependencyVersion: 0
  };
  
  return current;
}