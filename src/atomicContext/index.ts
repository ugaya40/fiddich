import {
  type AtomicPendingOptions,
  disposeForAtomicOperation,
  getForAtomicOperation,
  pendingForAtomicOperation,
  rejectAllChanges,
  setForAtomicOperation,
  touchForAtomicOperation,
} from '../atomicOperations';
import type { Cell, RefCell, State } from '../state';
import type { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';
import { createCopyStore } from './copyStore';
import type { AtomicContext, ComputedCopy, StateCopy } from './types';

export type { AtomicPendingOptions } from '../atomicOperations';
export * from './types';

export function createAtomicContext(): AtomicContext {
  const valueDirty = new Set<ComputedCopy>();
  const dependencyDirty = new Set<DependencyChangeSet<CopyState>>();
  const valueChanged = new Set<StateCopy>();
  const toDispose = new Set<Disposable>();
  const toNotify = new Set<StateCopy>();

  const partialContext: AtomicContext = {
    valueDirty,
    dependencyDirty,
    valueChanged,
    toDispose,
    toNotify,
    copyStore: null!,
    atomicUpdatePromise: undefined,
  };

  partialContext.copyStore = createCopyStore(partialContext);

  return partialContext;
}

export function createAtomicOperations(context: AtomicContext) {
  return {
    get: <T>(state: State<T>) => getForAtomicOperation(state, context),
    set: <T>(cell: Cell<T> | RefCell<T>, newValue: T) => setForAtomicOperation(cell, newValue, context),
    touch: (state: State) => touchForAtomicOperation(state, context),
    dispose: <T extends Disposable>(target: T) => disposeForAtomicOperation(target, context),
    pending: <T>(state: State<T>, options?: AtomicPendingOptions) => pendingForAtomicOperation(state, context, options),
    rejectAllChanges: () => rejectAllChanges(context),
  };
}
