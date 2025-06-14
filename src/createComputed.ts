import { Computed, DependentState, DependencyState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T> }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const dependencies = new Set<DependencyState>();
  
  const initialGetter = <V>(target: DependencyState<V>): V => {
    dependencies.add(target);
    return target.stableValue;
  };
  
  const initialValue = fn({ get: initialGetter });
  
  const computed: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    dependencies,
    
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
      return this.stableValue;
    },

    valueVersion: 0,
    dependencyVersion: 0
  };
  
  for (const dependency of dependencies) {
    dependency.dependents.add(computed);
  }
  
  return computed;
}