import { get } from './get';
import type { Computed, State } from './state';
import { type Compare, defaultCompare, generateStateId } from './util';
import { throwDisposedStateError } from './stateUtil/throwDisposedStateError';
import { initializeComputed } from './stateUtil/initializeComputed';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T,
  options?: {
    compare?: Compare<T>;
    onChange?: (prev: T, next: T) => void;
    onScheduledNotify?: () => void;
  }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  let isDisposed = false;
  const stableValue: T = undefined as any;

  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue,
    dependents: new Set<Computed>(),
    dependencies: new Set<State>(),
    isInitialized: false,

    compute(getter: <V>(target: State<V>) => V): T {
      const result = fn({ get: getter });
      return result;
    },

    compare,

    changeCallback: options?.onChange,
    onScheduledNotify: options?.onScheduledNotify,
    
    isDisposed,

    [Symbol.dispose](): void {
      if(isDisposed) return;
      
      for (const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();

      for (const dependent of current.dependents) {
        dependent.dependencies.delete(current);
        dependent[Symbol.dispose]();
      }

      current.dependents.clear();

      current.isDisposed = true;
    },

    toJSON(): T {
      if(current.isDisposed) {
        throwDisposedStateError();
      }
      if (!current.isInitialized) {
        initializeComputed(current);
      }
      return current.stableValue;
    },
  };

  return current;
}


