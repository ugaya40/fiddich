import { Compare } from './util';

export type DependentState<T = any> = Computed<T> | LeafComputed<T>;

export type DependencyState<T = any> = Cell<T> | Computed<T>;

export type Cell<T> = {
  stableValue: T;
  dependents: Set<DependentState>;
  version: number;

  set(newValue: T): void;

  compare: Compare<T>;
} & Disposable;

export type Computed<T> = {
  stableValue: T;
  dependents: Set<DependentState>;
  dependencies: Set<DependencyState>;
  version: number;
  
  // 計算を実行（getterを受け取る）
  compute(getter: <V>(target: DependencyState<V>) => V): T;

  compare: Compare<T>;
} & Disposable;

export type LeafComputed<T> = {
  stableValue: T;
  dependencies: Set<DependencyState>;
  version: number;
  
  // 計算を実行（getterを受け取る）
  compute(getter: <V>(target: DependencyState<V>) => V): T;
  
  // コールバック登録メソッド
  onChange(callback: (prev: T, newValue: T) => void): void;
  
  // 登録されたコールバック
  changeCallback?: (prev: T, newValue: T) => void;

  compare: Compare<T>;
} & Disposable;