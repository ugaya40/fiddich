import {
  type AtomicPendingOptions,
  disposeForAtomicOperation,
  getForAtomicOperation,
  pendingForAtomicOperation,
  rejectAllChanges,
  setForAtomicOperation,
  touchForAtomicOperation,
} from '../atomicOperations';
import type { CopyState, DependencyChangeSet } from '../stateUtil/dependencyTracker';
import type { Cell, RefCell, ValueStates } from '../types';
import type { ComputedCopy, ValueStateCopy } from './copy';
import { createCopyStore } from './copyStore';
import type { AtomicContext } from './types';

export function createAtomicContext(): AtomicContext {
  const valueDirty = new Set<ComputedCopy>();
  const dependencyDirty = new Set<DependencyChangeSet<CopyState>>();
  const valueChanged = new Set<ValueStateCopy>();
  const toDispose = new Set<Disposable>();
  const toNotify = new Set<ValueStateCopy>();

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
    get: <T>(state: ValueStates<T>) => getForAtomicOperation(state, context),
    set: <T>(cell: Cell<T> | RefCell<T>, newValue: T) => setForAtomicOperation(cell, newValue, context),
    touch: (state: ValueStates) => touchForAtomicOperation(state, context),
    dispose: <T extends Disposable>(target: T) => disposeForAtomicOperation(target, context),
    pending: <T>(state: ValueStates<T>, options?: AtomicPendingOptions) => pendingForAtomicOperation(state, context, options),
    rejectAllChanges: () => rejectAllChanges(context),
  };
}
