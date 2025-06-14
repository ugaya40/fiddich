import { LeafComputed, DependencyState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';

export function createLeafComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T> }
): LeafComputed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const dependencies = new Set<DependencyState>();
  
  const initialGetter = <V>(target: DependencyState<V>): V => {
    dependencies.add(target);
    return target.stableValue;
  };
  
  const initialValue = fn({ get: initialGetter });
  
  const leafComputed: LeafComputed<T> = {
    id: generateStateId(),
    kind: 'leafComputed',
    stableValue: initialValue,
    dependencies,
    
    compute(getter: <V>(target: DependencyState<V>) => V): T {
      const result = fn({ get: getter });
      
      return result;
    },
    
    onChange(callback: (prev: T, newValue: T) => void): void {
      this.changeCallback = callback;
    },
    
    compare,
    
    [Symbol.dispose](): void {
      for (const dependency of this.dependencies) {
        dependency.dependents.delete(this);
      }
      this.dependencies.clear();
      
      this.changeCallback = undefined;
    },

    toJSON(): T {
      return this.stableValue;
    },

    valueVersion: 0,
    dependencyVersion: 0
  };
  
  for (const dependency of dependencies) {
    dependency.dependents.add(leafComputed);
  }
  
  return leafComputed;
}