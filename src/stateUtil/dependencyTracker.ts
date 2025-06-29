import { ComputedCopy, StateCopy } from "../atomicContext";
import { createScopedCollector, ScopedCollector } from "../util";

export type DependencyChanges = {
  hasChanges: boolean;
  computed: ComputedCopy;
};

type DependencyTracker = {
  setScope: (scope: Record<string, never>) => void;
  exitScope: (scope: Record<string, never>) => DependencyChanges | null;
  track: (computed: ComputedCopy, dependency: StateCopy) => void;
};

function createDependencyTracker(): DependencyTracker {
  const collector: ScopedCollector<ComputedCopy, StateCopy, DependencyChanges> = createScopedCollector({
    createStoreForUnit: (computed) => {
      // Start with all existing dependencies as "remaining"
      const remainingOldDependencies = new Set(computed.dependencies);
      
      // Clear current dependencies to rebuild them
      for (const dep of computed.dependencies) {
        dep.dependents.delete(computed);
      }
      computed.dependencies.clear();
      
      return {
        remainingOldDependencies,
        hasNewDependencies: false
      };
    },
    processItem: (computed, store, dependency) => {
      // Skip if already tracked in this computation
      if (computed.dependencies.has(dependency)) {
        return;
      }
      
      // Check if this is a new dependency
      if (!store.remainingOldDependencies.has(dependency)) {
        store.hasNewDependencies = true;
      } else {
        // This dependency still exists, remove it from remaining
        store.remainingOldDependencies.delete(dependency);
      }
      
      // Add the active dependency relationship
      computed.dependencies.add(dependency);
      dependency.dependents.add(computed);
    },
    createResult: (map) => {
      // For now, just return the first entry (should only be one)
      for (const [computed, store] of map) {
        const hasChanges = store.hasNewDependencies || store.remainingOldDependencies.size > 0;
        return { hasChanges, computed };
      }
      throw new Error('No computed in dependency tracker');
    }
  });
  
  return {
    setScope: collector.setScope,
    exitScope: collector.exitScope,
    track: collector.collect
  };
}

const dependencyTracker = createDependencyTracker();
export function globalDependencyTracker() {
  return dependencyTracker;
}