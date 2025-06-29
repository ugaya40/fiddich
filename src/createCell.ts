import type { Cell, Computed } from './state';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util';
import { throwDisposedStateError } from './stateUtil/stateUtil';

export function createCell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onChange?: (prev: T, next: T) => void;
    onScheduledNotify?: () => void;
  }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  let isDisposed = false;
  const stableValue = initialValue;

  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    stableValue,
    dependents: new Set<Computed>(),

    compare,

    changeCallback: options?.onChange,
    onScheduledNotify: options?.onScheduledNotify,
    
    isDisposed,

    [Symbol.dispose](): void {
      if(isDisposed) return;

      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
      
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
      return current.stableValue;
    },
  };

  return current;
}

