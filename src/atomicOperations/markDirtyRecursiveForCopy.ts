import type { AtomicContext, ComputedCopy } from '../atomicContext';

export function markDirtyRecursiveForCopy(computedCopy: ComputedCopy, context: AtomicContext) {
  // Note: We don't need circular dependency detection here.
  // Diamond dependencies would cause false positives.
  // Since we propagate based on established dependencies from compute,
  // circular references cannot occur at this stage.
  if (computedCopy.isDirty) return;
  computedCopy.isDirty = true;
  context.valueDirty.add(computedCopy);
  for (const dependent of computedCopy.dependents) {
    markDirtyRecursiveForCopy(dependent, context);
  }
}
