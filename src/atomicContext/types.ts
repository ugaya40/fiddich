import type { ValueStates } from '../state';
import type { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';
import type { CellCopy, ComputedCopy, StateCopy } from './copy';

export type { CellCopy, ComputedCopy, StateCopy, StateCopyBase } from './copy';

import type { Cell, Computed, RefCell } from '../state';

export type CopyStore = {
  copyStoreMap: Map<ValueStates, StateCopy>;
  getCopy: {
    <T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
    <T>(state: Computed<T>): ComputedCopy<T>;
    <T>(state: ValueStates<T>): StateCopy<T>;
  };
  registerCopy: (state: ValueStates, copy: StateCopy) => void;
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
