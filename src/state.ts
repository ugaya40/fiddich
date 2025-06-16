import { Compare } from "./util";

export interface StateBase<T> {
  kind: string;
  id: string;
  stableValue: T;
  compare: Compare<T>;
  toJSON(): T;
  pendingPromise?: Promise<any>;
}

export interface Cell<T> extends StateBase<T>, Disposable {
  kind: 'cell';
  dependents: Set<DependentState>;
  valueVersion: number;
}

export interface Computed<T> extends StateBase<T>, Disposable {
  kind: 'computed';
  dependents: Set<DependentState>;
  dependencies: Set<DependencyState>;
  dependencyVersion: number;
  isInitialized: boolean;
  compute(getter: <V>(target: Cell<V> | Computed<V>) => V): T;
  changeCallback?: (prev: T, next: T) => void;
}

export type DependentState<T = any> = Computed<T>;
export type DependencyState<T = any> = Cell<T> | Computed<T>;
export type State<T = any> = Cell<T> | Computed<T>;
