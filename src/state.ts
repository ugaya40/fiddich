import type { Compare } from './util';

export interface StateBase<T = any> {
  kind: string;
  id: string;
  stableValue: T;
  compare: Compare<T>;
  toJSON(): T;
  pendingPromise?: Promise<any>;
  changeCallback?: (prev: T, next: T) => void;
  onScheduledNotify?: () => void;
}

export interface Cell<T = any> extends StateBase<T>, Disposable {
  kind: 'cell';
  dependents: Set<Computed>;
}

export interface Computed<T = any> extends StateBase<T>, Disposable {
  kind: 'computed';
  dependents: Set<Computed>;
  dependencies: Set<State>;
  isInitialized: boolean;
  compute(getter: <V>(target: Cell<V> | Computed<V>) => V): T;
}

export type State<T = any> = Cell<T> | Computed<T>;

/**
 * Extract the value type from a Cell or Computed
 * @example
 * type CountCell = Cell<number>;
 * type Count = StateValue<CountCell>; // number
 */
export type StateValue<T> = T extends State<infer V> ? V : never;

/**
 * Extract the value type from a Cell
 * @example
 * type CountCell = Cell<number>;
 * type Count = CellValue<CountCell>; // number
 */
export type CellValue<T> = T extends Cell<infer V> ? V : never;

/**
 * Extract the value type from a Computed
 * @example
 * type SumComputed = Computed<number>;
 * type Sum = ComputedValue<SumComputed>; // number
 */
export type ComputedValue<T> = T extends Computed<infer V> ? V : never;

/**
 * Type for a getter function used in Computed definitions
 */
export type StateGetter = <T>(state: State<T>) => T;

/**
 * Helper for creating nullable state patterns
 * @example
 * const userCell = createCell<User | null>(null);
 * type UserCell = NullableCell<User>; // Cell<User | null>
 */
export type NullableCell<T> = Cell<T | null>;
export type NullableComputed<T> = Computed<T | null>;

/**
 * Helper for creating optional state patterns
 * @example
 * const configCell = createCell<Config | undefined>(undefined);
 * type ConfigCell = OptionalCell<Config>; // Cell<Config | undefined>
 */
export type OptionalCell<T> = Cell<T | undefined>;
export type OptionalComputed<T> = Computed<T | undefined>;
