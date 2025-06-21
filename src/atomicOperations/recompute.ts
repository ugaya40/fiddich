import { AtomicContext, ComputedCopy, StateCopy } from '../atomicContext/index';
import { State } from '../state';
import { markDirectDependentsAsValueDirty } from '../stateUtil';
import { getForRecompute } from './get';
import { propagateTouchedRecursively } from './touch';

function createDependencyTracker(copy: ComputedCopy, context: AtomicContext) {
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
  
  const dependencyTracker = (targetCopy: StateCopy) => {
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
  
  // Dependencies changed if we have new ones or some old ones are no longer used
  const hasChanges = () => hasNewDependencies || remainingDependencies.size > 0;
  
  return { dependencyTracker, hasChanges };
}

export function recompute(copy: ComputedCopy, context: AtomicContext) {
  const { dependencyDirty, valueChangedDirty, notificationDirty, touchedStates } = context;

  const { dependencyTracker, hasChanges } = createDependencyTracker(copy, context);
    
  const oldValue = copy.value;
  const newValue = copy.original.compute(<T>(state:State<T>) => getForRecompute(state, context, dependencyTracker));
  
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
    
    markDirectDependentsAsValueDirty(copy, context);
  } 
  
  if (isTouched) {
    if(!hasValueChanged) {
      notificationDirty.add(copy);
      markDirectDependentsAsValueDirty(copy, context);
    }

    propagateTouchedRecursively(copy, context);
  }
}