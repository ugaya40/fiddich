import { Computed, DependencyState, Cell, State } from '../state';

export type StateCopyBase<T> = {
  id: string;
  value: T;
  rank: number;
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
}

export type DependencyCopy<T = any> = CellCopy<T> | ComputedCopy<T>;
export type DependentCopy<T = any> = ComputedCopy<T>;
export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;

export type CopyStore = {
  getCopy: <T>(state: State<T>) => StateCopy<T>;
  clear: () => void;
};

export type AtomicContextStore = {
  valueDirty: Set<DependentCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  copyStore: CopyStore;
  toDispose: Set<Disposable>;
  newlyInitialized: Set<ComputedCopy<any>>;
};

export type AtomicContext = {
  valueDirty: Set<DependentCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  copyStore: CopyStore;
  toDispose: Set<Disposable>;
  newlyInitialized: Set<ComputedCopy<any>>;
  commit: () => void;
  atomicUpdatePromise: Promise<any> | undefined;
  contextGetter: <T>(state: DependencyState<T>) => T;
};