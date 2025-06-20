import { AtomicContextStore, ComputedCopy, StateCopy } from '../atomicContext/index';
import { globalCircularDetector, markDependentsAsValueDirty, markDependentsAsTouched } from '../stateUtil';
import { createInnerGet } from './get';

function createDependencyTracker(copy: ComputedCopy, store: AtomicContextStore, recomputeComputed: (copy: ComputedCopy) => void) {
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
  
  const getter = createInnerGet(store, trackDependency, recomputeComputed);
  
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
      
      markDependentsAsValueDirty(copy, store);
    } 
    
    if (isTouched) {
      if(!hasValueChanged) {
        notificationDirty.add(copy);
        markDependentsAsValueDirty(copy, store);
      }

      markDependentsAsTouched(copy, store);
    }
  };
  
  return recomputeComputed;
}