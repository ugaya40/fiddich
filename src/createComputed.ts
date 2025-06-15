import { Computed, DependentState, DependencyState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';
import { get } from './get';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T> }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const computed: Computed<T> = {
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
    
    [Symbol.dispose](): void {
      for (const dependency of this.dependencies) {
        dependency.dependents.delete(this);
      }
      this.dependencies.clear();
      
      this.dependents.clear();
    },

    toJSON(): T {
      if (!this.isInitialized) {
        get(this);
      }
      return this.stableValue;
    },

    valueVersion: 0,
    dependencyVersion: 0
  };
  
  return computed;
}