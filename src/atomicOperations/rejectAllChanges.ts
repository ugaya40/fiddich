import type { AtomicContext } from '../atomicContext/types';

export function rejectAllChanges(context: AtomicContext) {
  context.dependencyDirty.clear();
  context.valueChanged.clear();
  context.valueDirty.clear();
  context.toDispose.clear();

  context.copyStore.clear();
}
