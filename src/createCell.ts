import type { Cell, Computed } from './state';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util';
import { markDirtyRecursive } from './markDirtyRecursive';
import { DisposedStateError } from './errors';
import { scheduleNotifications } from './stateUtil/scheduleNotifications';

export function createCell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onNotify: () => void;
  }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  let stableValueInternal = initialValue;
  let pendingPromiseInternal: Promise<any> | undefined = undefined;

  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',

    get stableValue() {
      return stableValueInternal;
    },

    set stableValue(value: T) {
      stableValueInternal = value;
      scheduleNotifications([current]);
    },

    dependents: new Set<Computed>(),

    compare,
    
    isDisposed: false,

    onNotify: options?.onNotify,

    get pendingPromise() {
      return pendingPromiseInternal;
    },

    set pendingPromise(value: Promise<any> | undefined) {
      pendingPromiseInternal = value;
      scheduleNotifications([current]);
    },

    [Symbol.dispose](): void {
      if(current.isDisposed) return;

      current.isDisposed = true;

      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
      for(const computed of current.dependents) {
        markDirtyRecursive(computed);
      }

      scheduleNotifications([current]);
    },

    toJSON(): T {
      if(current.isDisposed) {
        throw new DisposedStateError();
      }
      return current.stableValue;
    },
  };

  return current;
}

