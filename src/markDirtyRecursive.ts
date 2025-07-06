import { Computed } from "./state";

export function markDirtyRecursive(computed: Computed) {
  // Note: We don't need circular dependency detection here.
  // Diamond dependencies would cause false positives.
  // Since we propagate based on established dependencies from compute,
  // circular references cannot occur at this stage.
  if(computed.isDirty) return;
  computed.isDirty = true;
  for(const dependent of computed.dependents) {
    markDirtyRecursive(dependent);
  }
}