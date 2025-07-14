import { DisposedStateError } from './errors';
import { markDirtyRecursive } from './markDirtyRecursive';
import type { Cell, Computed, RefCell, StateEvent } from './state';
import { createEventEmitter } from './util/eventEmitter';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util/util';

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
  let pendingPromiseInternal: Promise<any> | undefined;

  const event = createEventEmitter<StateEvent>();
  if(options?.onNotify != null) {
    event.on('onNotify', options.onNotify);
  }

  if(options?.onPendingChange != null) {
    event.on('onPendingChange', options.onPendingChange);
  }

  const current: Cell<T> | RefCell<T> = {
    id: generateStateId(),
    kind: 'cell',
    event,

    get stableValue() {
      return stableValueInternal;
    },

    set stableValue(value: T) {
      stableValueInternal = value;
      event.emit('onNotify', undefined);
    },

    dependents: new Set<Computed>(),

    compare,

    autoDispose,

    isDisposed: false,

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

      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
      for (const computed of current.dependents) {
        markDirtyRecursive(computed);
      }

      event.emit('onNotify', undefined);
      event[Symbol.dispose]();
    },

    toJSON(): T {
      if (current.isDisposed) {
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
