import { get } from './get';
import type { Computed, State } from './state';
import { type Compare, defaultCompare, generateStateId } from './util';
import { checkDisposed } from './stateUtil/stateUtil';
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
  let disposed = false;
  let value: T = undefined as any;

  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    get stableValue(): T {
      checkDisposed(current);
      return value;
    },
    set stableValue(newValue: T) {
      checkDisposed(current);
      value = newValue;
    },
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
    
    get isDisposed() {
      return disposed;
    },

    [Symbol.dispose](): void {
      if(disposed) return;
      disposed = true;
      
      for (const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();

      for (const dependent of current.dependents) {
        dependent.dependencies.delete(current);
        dependent[Symbol.dispose]();
      }

      current.dependents.clear();
    },

    toJSON(): T {
      checkDisposed(current);
      if (!current.isInitialized) {
        initializeComputed(current);
      }
      return value;
    },
  };

  return current;
}


