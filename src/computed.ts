import { DisposedStateError } from './errors';
import { get } from './get';
import { markDirtyRecursive } from './markDirtyRecursive';
import type { Computed, State, StateEvent } from './state';
import { createEventEmitter } from './util/eventEmitter';
import { type Compare, defaultCompare, generateStateId } from './util/util';

export function computed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T,
  options?: {
    compare?: Compare<T>;
    onNotify?: () => void;
    onPendingChange?: () => void;
  }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  let isDirtyInternal = true;
  let stableValue: T = undefined as any;
  let pendingPromiseInternal: Promise<any> | undefined;

  const event = createEventEmitter<StateEvent>();
  if(options?.onNotify != null) {
    event.on('onNotify', options.onNotify);
  }

  if(options?.onPendingChange != null) {
    event.on('onPendingChange', options.onPendingChange);
  }

  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue,
    dependents: new Set<Computed>(),
    dependencies: new Set<State>(),
    event,

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
      if (isDirtyInternal) {
        event.emit('onNotify', undefined);
      }
    },

    get pendingPromise() {
      return pendingPromiseInternal;
    },

    set pendingPromise(value: Promise<any> | undefined) {
      pendingPromiseInternal = value;
      if (value != null) {
        event.emit('onPendingChange', undefined);
      }
    },

    [Symbol.dispose](): void {
      if (current.isDisposed) return;
      current.isDisposed = true;

      for (const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();

      markDirtyRecursive(current);
      event[Symbol.dispose]();
    },

    toJSON(): T {
      if (current.isDisposed) {
        throw new DisposedStateError();
      }

      if (current.isDirty) {
        current.compute(get);
      }

      return current.stableValue;
    },
  };

  return current;
}
