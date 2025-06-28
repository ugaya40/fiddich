import type { Cell, Computed } from './state';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util';
import { checkDisposed } from './stateUtil/stateUtil';

export function createCell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onChange?: (prev: T, next: T) => void;
    onScheduledNotify?: () => void;
  }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  let disposed = false;
  let value = initialValue;

  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    get stableValue(): T {
      checkDisposed(current);
      return value;
    },
    set stableValue(newValue: T) {
      checkDisposed(current);
      value = newValue;
    },
    dependents: new Set<Computed>(),

    compare,

    changeCallback: options?.onChange,
    onScheduledNotify: options?.onScheduledNotify,
    
    get isDisposed() {
      return disposed;
    },

    [Symbol.dispose](): void {
      if(disposed) return;
      disposed = true;

      if (isDisposable(value)) {
        value[Symbol.dispose]();
      }
      
      for (const dependent of current.dependents) {
        dependent.dependencies.delete(current);
        dependent[Symbol.dispose]();
      }
      current.dependents.clear();
    },

    toJSON(): T {
      checkDisposed(current);
      return value;
    },
  };

  return current;
}

