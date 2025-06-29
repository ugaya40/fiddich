import { ComputedCopy, DependencyChanges, StateCopy } from "../atomicContext";
import { createScopedCollector, ScopedCollector } from "../util";

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
      
      return {
        remainingOldDependencies,
        added: [] as StateCopy[]
      };
    },
    processItem: (computed, store, dependency) => {
      
      // Check if this is a new dependency
      if (!store.remainingOldDependencies.has(dependency)) {
        if(!computed.dependencies.has(dependency)) {
          computed.dependencies.add(dependency);
          dependency.dependents.add(computed);
          store.added.push(dependency);
        }
      } else {
        // This dependency still exists, remove it from remaining
        store.remainingOldDependencies.delete(dependency);
      }
      
    },
    createResult: (map) => {
      // For now, just return the first entry (should only be one)
      for (const [computed, store] of map) {

        const deleted = [...store.remainingOldDependencies];

        for(const oldDependency of deleted) {
          computed.dependencies.delete(oldDependency);
          oldDependency.dependents.delete(computed);
        }

        return { 
          computedCopy: computed,
          changes: {
            added: store.added,
            deleted
          }
        };
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