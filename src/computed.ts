import { get } from './get';
import type { Computed, State } from './state';
import { type Compare, defaultCompare, generateStateId } from './util';
import { markDirtyRecursive } from './markDirtyRecursive';
import { DisposedStateError } from './errors';

export function computed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T,
  options?: {
    compare?: Compare<T>;
    onNotify: () => void;
  }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  let isDirtyInternal = true;
  let stableValue: T = undefined as any;

  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue,
    dependents: new Set<Computed>(),
    dependencies: new Set<State>(),

    compute(getter: <V>(target: State<V>) => V): T {
      return fn({ get: getter });
    },

    compare,
    
    isDisposed: false,

    get isDirty() {
      return isDirtyInternal;
    },

    set isDirty(value: boolean) {
      isDirtyInternal = value;
      if(isDirtyInternal) {
        current.onNotify?.();
      }
    },

    onNotify: options?.onNotify,

    [Symbol.dispose](): void {
      if(current.isDisposed) return;
      current.isDisposed = true;

      for(const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();

      markDirtyRecursive(current);
    },

    toJSON(): T {
      if(current.isDisposed) {
        throw new DisposedStateError();
      }

      if(current.isDirty) {
        current.compute(get);
      }

      return current.stableValue;
    },
  };

  return current;
}


