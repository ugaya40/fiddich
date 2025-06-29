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
    processItem: (computedCopy, store, dependencyCopy) => {
      
      // Check if this is a new dependency
      if (!store.remainingOldDependencies.has(dependencyCopy)) {
        if(!computedCopy.dependencies.has(dependencyCopy)) {
          computedCopy.dependencies.add(dependencyCopy);
          dependencyCopy.dependents.add(computedCopy);
          store.added.push(dependencyCopy);
        }
      } else {
        // This dependency still exists, remove it from remaining
        store.remainingOldDependencies.delete(dependencyCopy);
      }
      
    },
    createResult: (map) => {
      // For now, just return the first entry (should only be one)
      for (const [computed, store] of map) {

        const deleted = [...store.remainingOldDependencies];

        for(const oldDependencyCopy of deleted) {
          computed.dependencies.delete(oldDependencyCopy);
          oldDependencyCopy.dependents.delete(computed);
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