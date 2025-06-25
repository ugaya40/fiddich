import type { Cell, Computed } from './state';
import { type Compare, defaultCompare, generateStateId, isDisposable } from './util';

export function createCell<T>(
  initialValue: T,
  options?: {
    compare?: Compare<T>;
    onChange?: (prev: T, next: T) => void;
    onScheduledNotify?: () => void;
  }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;

  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    stableValue: initialValue,
    dependents: new Set<Computed>(),

    compare,

    changeCallback: options?.onChange,
    onScheduledNotify: options?.onScheduledNotify,

    [Symbol.dispose](): void {
      for (const dependent of current.dependents) {
        dependent.dependencies.delete(current);
      }
      current.dependents.clear();

      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
    },

    toJSON(): T {
      return current.stableValue;
    },
  };

  return current;
}

