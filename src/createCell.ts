import { Cell, DependentState, NullableCell, OptionalCell } from './state';
import { Compare, defaultCompare, generateStateId, isDisposable } from './util';

export function createCell<T>(
  initialValue: T,
  options?: { compare?: Compare<T> }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    
    compare,
    
    [Symbol.dispose](): void {
      current.dependents.clear();
      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
    },

    toJSON(): T {
      return current.stableValue;
    },

    valueVersion: 0
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
  options?: { compare?: Compare<T | null> }
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
  options?: { compare?: Compare<T | undefined> }
): OptionalCell<T> {
  return createCell<T | undefined>(initialValue, options);
}