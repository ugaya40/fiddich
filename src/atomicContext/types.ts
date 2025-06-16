import { Computed, DependencyState, Cell, State } from '../state';

export type StateCopyBase<T> = {
  id: string;
  value: T
}

export interface CellCopy<T> extends StateCopyBase<T> {
  kind: 'cell',
  dependents: Set<DependentCopy>,
  valueVersion: number,
  original: Cell<T>,
}

export interface ComputedCopy<T> extends StateCopyBase<T> {
  kind: 'computed',
  dependents: Set<DependentCopy>,
  dependencies: Set<DependencyCopy>,
  dependencyVersion: number,
  original: Computed<T>,
  isInitialized: boolean,
  compute?: (getter: (state: DependencyState<any>) => any) => T,
}

export type DependencyCopy<T = any> = CellCopy<T> | ComputedCopy<T>;
export type DependentCopy<T = any> = ComputedCopy<T>;
export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;

export type AtomicContextStore = {
  valueDirty: Set<DependentCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  copyStore: { getCopy: <T>(state: State<T>) => StateCopy<T> };
  toDispose: Set<Disposable>;
  newlyInitialized: Set<ComputedCopy<any>>;
};

export type AtomicContext = {
  valueDirty: Set<DependentCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  copyStore: { getCopy: <T>(state: State<T>) => StateCopy<T> };
  toDispose: Set<Disposable>;
  newlyInitialized: Set<ComputedCopy<any>>;
  commit: () => void;
  atomicUpdatePromise: Promise<any> | undefined;
  contextGetter: <T>(state: DependencyState<T>) => T;
};