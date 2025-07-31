import type { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';
import type { Cell, Computed, RefCell, ValueStates } from '../types';
import type { CellCopy, ComputedCopy, ValueStateCopy } from './copy';

export type CopyStore = {
  copyStoreMap: Map<ValueStates, ValueStateCopy>;
  getCopy: {
    <T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
    <T>(state: Computed<T>): ComputedCopy<T>;
    <T>(state: ValueStates<T>): ValueStateCopy<T>;
  };
  registerCopy: (state: ValueStates, copy: ValueStateCopy) => void;
  clear: () => void;
};

export type AtomicContext = {
  copyStore: CopyStore;
  valueDirty: Set<ComputedCopy>;
  dependencyDirty: Set<DependencyChangeSet<CopyState>>;
  valueChanged: Set<ValueStateCopy>;
  toDispose: Set<Disposable>;
  toNotify: Set<ValueStateCopy>;
  atomicUpdatePromise: Promise<any> | undefined;
};
