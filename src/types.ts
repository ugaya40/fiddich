import type { Cell, RefCell } from './cell';
import type { ReactiveCollections } from './collections';
import type { Computed } from './computed';
import type { EventEmitter } from './util/eventEmitter';
import type { Compare } from './util/util';

export type StateEvent = {
  onNotify: void;
  onPendingChange: void;
};

export interface ReactiveState extends Disposable {
  kind: string;
  id: string;
  dependents: Set<Computed>;
  isDisposed: boolean;
  pendingPromise?: Promise<any>;
  event: EventEmitter<StateEvent>;
  toJSON(): unknown;
}

export interface ValueState<T = any> extends ReactiveState {
  stableValue: T;
  compare: Compare<T>;
  toJSON(): T;
}

export type ValueStates<T = any> = Cell<T> | RefCell<T> | Computed<T>;
export type States = ValueStates | ReactiveCollections;

/**
 * Extract the value type from a Cell or Computed
 * @example
 * type CountCell = Cell<number>;
 * type Count = StateValue<CountCell>; // number
 */
export type StateValue<T> = T extends ValueStates<infer V> ? V : never;

/**
 * Extract the value type from a Cell
 * @example
 * type CountCell = Cell<number>;
 * type Count = CellValue<CountCell>; // number
 */
export type CellValue<T> = T extends Cell<infer V> ? V : T extends RefCell<infer V> ? V : never;

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
export type StateGetter = <T>(state: ValueStates<T>) => T;
