import { AtomicContextStore, ComputedCopy, StateCopy } from '../atomicContext/index';
import { State } from '../state';
import { isComputedCopy } from '../stateUtil';

function createDependencyTracker(copy: ComputedCopy, store: AtomicContextStore, recomputeDependent: (copy: ComputedCopy) => void) {
  // Start with all existing dependencies in a "remaining" set
  // As we re-discover dependencies during recomputation, we'll remove them from this set
  // Any dependencies left in this set at the end are no longer needed
  const remainingDependencies = new Set(copy.dependencies);
  let hasNewDependencies = false;
  
  // Remove this computed from all its current dependencies' dependents sets
  // We'll re-add only the dependencies that are still active during recomputation
  for(const dep of copy.dependencies) {
    dep.dependents.delete(copy);
  }
  copy.dependencies.clear();
  
  const trackDependency = (targetCopy: StateCopy<any>) => {
    // Skip if already tracked in this computation
    if (copy.dependencies.has(targetCopy)) {
      return;
    }
    
    // Check if this is a new dependency (not in the previous dependency set)
    if (!remainingDependencies.has(targetCopy)) {
      hasNewDependencies = true;
    } else {
      // This dependency still exists, remove it from the "remaining" set
      remainingDependencies.delete(targetCopy);
    }
    
    // Add the active dependency relationship
    copy.dependencies.add(targetCopy);
    targetCopy.dependents.add(copy);
  };
  
  const getter = <V>(target: State<V>): V => {
    const targetCopy = store.copyStore.getCopy(target);
    
    // If the dependency is a computed that needs recalculation, do it now
    if (isComputedCopy(targetCopy) && store.valueDirty.has(targetCopy)) {
      recomputeDependent(targetCopy);
      store.valueDirty.delete(targetCopy);
    }
    
    // Track this as an active dependency
    trackDependency(targetCopy);
    return targetCopy.value;
  };
  
  // Dependencies changed if we have new ones or some old ones are no longer used
  const hasChanges = () => hasNewDependencies || remainingDependencies.size > 0;
  
  return { getter, hasChanges };
}

export function createRecomputeComputed(store: AtomicContextStore) {
  const { dependencyDirty, valueChangedDirty, notificationDirty, touchedStates } = store;
  
  const recomputeComputed = (copy: ComputedCopy) => {
    const { getter, hasChanges } = createDependencyTracker(copy, store, recomputeComputed);
    
    const oldValue = copy.value;
    const newValue = copy.original.compute(getter);
    
    if (hasChanges()) {
      dependencyDirty.add(copy);
      
      // Update rank based on new dependencies
      const newRank = copy.dependencies.size > 0
        ? Math.max(...[...copy.dependencies].map(d => d.rank)) + 1
        : 0;
      
      if (newRank > copy.rank) {
        copy.rank = newRank;
        // Note: We don't need to propagate rank updates to dependents
        // because they will be recalculated when processed
      }
    }
    
    const isTouched = touchedStates.has(copy);
    const hasValueChanged = !copy.original.compare(oldValue, newValue);
    
    if (hasValueChanged) {
      copy.value = newValue;
      valueChangedDirty.add(copy);

      for (const dependent of copy.dependents) {
        store.valueDirty.add(dependent);
      }
    } 
    
    if (isTouched) {
      if(!hasValueChanged) {
        notificationDirty.add(copy);
        for (const dependent of copy.dependents) {
          store.valueDirty.add(dependent);
        }
      }

      for (const dependent of copy.dependents) {
        touchedStates.add(dependent);
      }
    }
  };
  
  return recomputeComputed;
}