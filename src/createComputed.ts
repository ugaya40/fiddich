import { get } from './get';
import type { Computed, NullableComputed, OptionalComputed, State } from './state';
import { type Compare, defaultCompare, generateStateId } from './util';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T,
  options?: {
    compare?: Compare<T>;
    onChange?: (prev: T, next: T) => void;
    onScheduledNotify?: () => void;
  }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;

  const current: Computed<T> = {
    id: generateStateId(),
    kind: 'computed',
    stableValue: undefined as any,
    dependents: new Set<Computed>(),
    dependencies: new Set<State>(),
    isInitialized: false,

    compute(getter: <V>(target: State<V>) => V): T {
      const result = fn({ get: getter });
      return result;
    },

    compare,

    changeCallback: options?.onChange,
    onScheduledNotify: options?.onScheduledNotify,

    [Symbol.dispose](): void {
      for (const dependency of current.dependencies) {
        dependency.dependents.delete(current);
      }
      current.dependencies.clear();

      current.dependents.clear();
    },

    toJSON(): T {
      if (!current.isInitialized) {
        get(current);
      }
      return current.stableValue;
    }
  };

  return current;
}

/**
 * Create a Computed that can return a value or null
 * @example
 * const userNameComputed = createNullableComputed(
 *   ({ get }) => get(userCell)?.name ?? null
 * );
 * // Type is Computed<string | null>
 */
export function createNullableComputed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T | null,
  options?: {
    compare?: Compare<T | null>;
    onChange?: (prev: T | null, next: T | null) => void;
    onScheduledNotify?: () => void;
  }
): NullableComputed<T> {
  return createComputed<T | null>(fn, options);
}

/**
 * Create a Computed that can return a value or undefined
 * @example
 * const selectedItemComputed = createOptionalComputed(
 *   ({ get }) => items.find(item => item.id === get(selectedIdCell))
 * );
 * // Type is Computed<Item | undefined>
 */
export function createOptionalComputed<T>(
  fn: (arg: { get: <V>(target: State<V>) => V }) => T | undefined,
  options?: {
    compare?: Compare<T | undefined>;
    onChange?: (prev: T | undefined, next: T | undefined) => void;
    onScheduledNotify?: () => void;
  }
): OptionalComputed<T> {
  return createComputed<T | undefined>(fn, options);
}
