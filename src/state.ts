import { Compare } from "./util";

export interface StateBase<T> {
  kind: string;
  id: string;
  stableValue: T;
  compare: Compare<T>;
  dependencyVersion: number;
  valueVersion: number;
  toJSON(): T;
}

export interface Cell<T> extends StateBase<T>, Disposable {
  kind: 'cell';
  dependents: Set<DependentState>;
  set(newValue: T): void;
}

export interface Computed<T> extends StateBase<T>, Disposable {
  kind: 'computed';
  dependents: Set<DependentState>;
  dependencies: Set<DependencyState>;
  isInitialized: boolean;
  compute(getter: <V>(target: Cell<V> | Computed<V>) => V): T;
}

export interface LeafComputed<T> extends StateBase<T>, Disposable {
  kind: 'leafComputed';
  dependencies: Set<DependencyState>;
  isInitialized: boolean;
  compute(getter: <V>(target: DependencyState<V>) => V): T;
  onChange(callback: (prev: T, next: T) => void): void;
  changeCallback?: (prev: T, next: T) => void;
}

export type DependentState<T = any> = Computed<T> | LeafComputed<T>;
export type DependencyState<T = any> = Cell<T> | Computed<T>;
export type State<T = any> = Cell<T> | Computed<T> | LeafComputed<T>;
