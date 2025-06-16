import { createGet, createSet, createTouch, createDispose, createPending, createRejectAllChanges } from '../atomicOperations';
import { createCopyStore } from './copyStore';
import { createCommit } from './commit';
import { AtomicContext, DependentCopy, StateCopy, ComputedCopy } from './types';
import { lazyFunction } from '../util';

export * from './types';

export function createAtomicContext(): AtomicContext {
  const valueDirty = new Set<DependentCopy>();
  const dependencyDirty = new Set<StateCopy>();
  const valueChangedDirty = new Set<StateCopy>();
  const toDispose = new Set<Disposable>();
  const newlyInitialized = new Set<ComputedCopy<any>>();
  
  const partialContext: AtomicContext = {
    valueDirty,
    dependencyDirty,
    valueChangedDirty,
    copyStore: null!,
    toDispose,
    newlyInitialized,
    commit: null!,
    atomicUpdatePromise: undefined,
    contextGetter: null!
  };
  
  partialContext.contextGetter = createGet(partialContext);
  
  partialContext.copyStore = createCopyStore(partialContext);
  
  partialContext.commit = createCommit(partialContext);
  
  return partialContext;
}

export function createAtomicOperations(context: AtomicContext) {
  return {
    get: context.contextGetter,
    set: lazyFunction(() => createSet(context)),
    touch: lazyFunction(() => createTouch(context)),
    dispose: lazyFunction(() => createDispose(context)),
    pending: lazyFunction(() => createPending(context)),
    rejectAllChanges: lazyFunction(() => createRejectAllChanges(context))
  };
}