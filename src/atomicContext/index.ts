import { createGet, createSet, createTouch, createDispose, createPending, createRejectAllChanges } from '../atomicOperations';
import { createCopyStore } from './copyStore';
import { createCommit } from './commit';
import { AtomicContext, StateCopy, ComputedCopy } from './types';
import { lazyFunction } from '../util';

export * from './types';

export function createAtomicContext(): AtomicContext {
  const valueDirty = new Set<ComputedCopy>();
  const dependencyDirty = new Set<StateCopy>();
  const valueChangedDirty = new Set<StateCopy>();
  const notificationDirty = new Set<StateCopy>();
  const toDispose = new Set<Disposable>();
  const newlyInitialized = new Set<ComputedCopy<any>>();
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
    commit: null!,
    atomicUpdatePromise: undefined,
  };
  
  
  partialContext.copyStore = createCopyStore(partialContext);
  
  partialContext.commit = createCommit(partialContext);
  
  return partialContext;
}

export function createAtomicOperations(context: AtomicContext) {
  return {
    get: lazyFunction(() => createGet(context)),
    set: lazyFunction(() => createSet(context)),
    touch: lazyFunction(() => createTouch(context)),
    dispose: lazyFunction(() => createDispose(context)),
    pending: lazyFunction(() => createPending(context)),
    rejectAllChanges: lazyFunction(() => createRejectAllChanges(context))
  };
}