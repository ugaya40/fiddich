import {
  dispose,
  getForAtomicOperation,
  pendingForAtomicOperation,
  rejectAllChanges,
  setForAtomicOperation,
  touchForAtomicOperation,
} from '../atomicOperations';
import type { Cell, State } from '../state';
import { commit } from './commit';
import { createCopyStore } from './copyStore';
import type { AtomicContext, ComputedCopy, StateCopy } from './types';

export * from './types';

export function createAtomicContext(startCheckpoint: number): AtomicContext {
  const valueDirty = new Set<ComputedCopy>();
  const dependencyDirty = new Set<StateCopy>();
  const valueChangedDirty = new Set<StateCopy>();
  const notificationDirty = new Set<StateCopy>();
  const toDispose = new Set<Disposable>();
  const newlyInitialized = new Set<ComputedCopy>();
  const touchedStates = new Set<StateCopy>();

  const partialContext: AtomicContext = {
    valueDirty,
    dependencyDirty,
    valueChangedDirty,
    notificationDirty,
    copyStore: null!,
    toDispose,
    newlyInitialized,
    touchedStates,
    startCheckpoint,
    commit: null!,
    atomicUpdatePromise: undefined,
  };

  partialContext.copyStore = createCopyStore(partialContext);
  partialContext.commit = () => commit(partialContext);

  return partialContext;
}

export function createAtomicOperations(context: AtomicContext) {
  return {
    get: <T>(state: State<T>) => getForAtomicOperation(state, context),
    set: <T>(cell: Cell<T>, newValue: T) => setForAtomicOperation(cell, newValue, context),
    touch: (state: State) => touchForAtomicOperation(state, context),
    dispose: <T extends Disposable>(target: T) => dispose(target, context),
    pending: <T>(state: State<T>, promise?: Promise<any>) =>
      pendingForAtomicOperation(state, context, promise),
    rejectAllChanges: () => rejectAllChanges(context),
  };
}
