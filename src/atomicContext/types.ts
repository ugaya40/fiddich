import type { Cell, Computed, State } from '../state';

export type StateCopyBase<T = any> = {
  id: string;
  value: T;
  rank: number;
};

export interface CellCopy<T = any> extends StateCopyBase<T> {
  kind: 'cell';
  dependents: Set<ComputedCopy>;
  original: Cell<T>;
}

export interface ComputedCopy<T = any> extends StateCopyBase<T> {
  kind: 'computed';
  dependents: Set<ComputedCopy>;
  dependencies: Set<StateCopy>;
  original: Computed<T>;
  isInitialized: boolean;
}

export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;

export type CopyStore = {
  copyStoreMap: Map<State, StateCopy>;
  getCopy: <T>(state: State<T>) => StateCopy<T>;
  clear: () => void;
};

export type AtomicContext = {
  valueDirty: Set<ComputedCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  notificationDirty: Set<StateCopy>;
  copyStore: CopyStore;
  toDispose: Set<Disposable>;
  newlyInitialized: Set<ComputedCopy>;
  touchedStates: Set<StateCopy>;
  atomicUpdatePromise: Promise<any> | undefined;
};
