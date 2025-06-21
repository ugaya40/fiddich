import type { AtomicContext } from '../atomicContext/types';

export function rejectAllChanges(context: AtomicContext) {
  context.valueDirty.clear();
  context.dependencyDirty.clear();
  context.valueChangedDirty.clear();
  context.notificationDirty.clear();
  context.newlyInitialized.clear();
  context.toDispose.clear();
  context.touchedStates.clear();

  context.copyStore.clear();
}
