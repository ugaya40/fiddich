import { LeafComputed, DependencyState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';
import { initializeLeafComputed } from './get';

export function createLeafComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T> }
): LeafComputed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const leafComputed: LeafComputed<T> = {
    id: generateStateId(),
    kind: 'leafComputed',
    stableValue: undefined as any,
    dependencies: new Set<DependencyState>(),
    isInitialized: false,
    
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
      if (!this.isInitialized) {
        initializeLeafComputed(this);
      }
      return this.stableValue;
    },

    dependencyVersion: 0
  };
  
  return leafComputed;
}