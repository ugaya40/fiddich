import type { Cell, RefCell } from '../cell';
import type { ReactiveCollections } from '../collections';
import type { Computed } from '../computed';
import type { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';
import type { States, ValueStateBase, ValueStates } from '../types';
import type { CellCopy, ComputedCopy, ReactiveCollectionCopy, StateCopy, ValueStateCopy } from './copy';

export type CopyStore = {
  copyStoreMap: Map<States, StateCopy>;
  getCopy: {
    <T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
    <T>(state: Computed<T>): ComputedCopy<T>;
    (state: ValueStates): ValueStateCopy;
    (state: ReactiveCollections): ReactiveCollectionCopy;
    (state: States): StateCopy;
  };
  registerCopy: (state: States, copy: StateCopy) => void;
  clear: () => void;
};

export type AtomicContext = {
  copyStore: CopyStore;
  valueDirty: Set<ComputedCopy>;
  dependencyDirty: Set<DependencyChangeSet<CopyState>>;
  valueChanged: Set<ValueStateCopy>;
  toDispose: Set<Disposable>;
  toNotify: Set<StateCopy>;
  atomicUpdatePromise: Promise<any> | undefined;
};
