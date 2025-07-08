import type { Cell, Computed, RefCell, State } from '../state';
import { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';

export type StateCopyBase<T = any> = {
  id: string;
  value: T;
  isDisposed: boolean;
};

export interface CellCopy<T = any> extends StateCopyBase<T> {
  kind: 'cell';
  dependents: Set<ComputedCopy>;
  original: Cell<T> | RefCell<T>;
}

export interface ComputedCopy<T = any> extends StateCopyBase<T> {
  kind: 'computed';
  dependents: Set<ComputedCopy>;
  dependencies: Set<StateCopy>;
  original: Computed<T>;
  isDirty: boolean;
}

export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;

export type CopyStore = {
  copyStoreMap: Map<State, StateCopy>;
  getCopy: <T>(state: State<T>) => StateCopy<T>;
  clear: () => void;
};

export type AtomicContext = {
  copyStore: CopyStore;
  valueDirty: Set<ComputedCopy>;
  dependencyDirty: Set<DependencyChangeSet<CopyState>>;
  valueChanged: Set<StateCopy>;
  toDispose: Set<Disposable>;
  toNotify: Set<StateCopy>;
  atomicUpdatePromise: Promise<any> | undefined;
};
