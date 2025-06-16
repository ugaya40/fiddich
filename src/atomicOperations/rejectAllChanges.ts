import { AtomicContext } from '../atomicContext/types';

export function createRejectAllChanges(context: AtomicContext) {
  return () => {
    // Clear all dirty sets
    context.valueDirty.clear();
    context.dependencyDirty.clear();
    context.valueChangedDirty.clear();
    context.newlyInitialized.clear();
    context.toDispose.clear();
    
    // Clear the copy store (this will reset all state copies)
    context.copyStore.clear();
  };
}