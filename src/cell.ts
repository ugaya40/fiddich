import type { Cell, Computed, RefCell } from './state';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util';
import { markDirtyRecursive } from './markDirtyRecursive';
import { DisposedStateError } from './errors';

function createCellInternal<T>(
  initialValue: T,
  autoDispose: boolean,
  options?: {
    compare?: Compare<T>;
    onNotify?: () => void;
    onPendingChange?: () => void;
  }
): Cell<T> | RefCell<T> {
  const compare = options?.compare ?? defaultCompare;
  let stableValueInternal = initialValue;
  let pendingPromiseInternal: Promise<any> | undefined = undefined;

  const current: Cell<T> | RefCell<T> = {
    id: generateStateId(),
    kind: 'cell',

    get stableValue() {
      return stableValueInternal;
    },

    set stableValue(value: T) {
      stableValueInternal = value;
      current.onNotify?.();
    },

    dependents: new Set<Computed>(),

    compare,

    autoDispose,
    
    isDisposed: false,

    onNotify: options?.onNotify,
    
    onPendingChange: options?.onPendingChange,

    get pendingPromise() {
      return pendingPromiseInternal;
    },

    set pendingPromise(value: Promise<any> | undefined) {
      pendingPromiseInternal = value;
      if (value != null) {
        current.onPendingChange?.();
      }
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

      current.onNotify?.();
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

export function cell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onNotify?: () => void;
    onPendingChange?: () => void;
  }
): Cell<T> {
  return createCellInternal(initialValue, true, options) as Cell<T>;
}

export function refCell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onNotify?: () => void;
    onPendingChange?: () => void;
  }
): RefCell<T> {
  return createCellInternal(initialValue, false, options) as RefCell<T>;
}

