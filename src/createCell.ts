import type { Cell, Computed, NullableCell, OptionalCell } from './state';
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
      current.dependents.clear();
      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
    },

    toJSON(): T {
      return current.stableValue;
    }
  };

  return current;
}

/**
 * Create a Cell that can hold a value or null
 * @example
 * const userCell = createNullableCell<User>(null);
 * // Type is Cell<User | null>
 */
export function createNullableCell<T>(
  initialValue: T | null = null,
  options?: {
    compare?: Compare<T | null>;
    onChange?: (prev: T | null, next: T | null) => void;
    onScheduledNotify?: () => void;
  }
): NullableCell<T> {
  return createCell<T | null>(initialValue, options);
}

/**
 * Create a Cell that can hold a value or undefined
 * @example
 * const configCell = createOptionalCell<Config>();
 * // Type is Cell<Config | undefined>
 */
export function createOptionalCell<T>(
  initialValue?: T,
  options?: {
    compare?: Compare<T | undefined>;
    onChange?: (prev: T | undefined, next: T | undefined) => void;
    onScheduledNotify?: () => void;
  }
): OptionalCell<T> {
  return createCell<T | undefined>(initialValue, options);
}
