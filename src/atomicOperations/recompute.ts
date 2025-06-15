import { AtomicContextStore, DependencyCopy, DependentCopy, ComputedCopy, LeafComputedCopy } from '../atomicContext';
import { DependencyState } from '../state';

function createDependencyTracker(copy: ComputedCopy<any> | LeafComputedCopy<any>, store: AtomicContextStore, recomputeDependent: (copy: DependentCopy) => void) {
  // Dependencies that remain after recomputation are no longer needed
  const remainingDependencies = new Set(copy.dependencies);
  // Track if any new dependencies were added during recomputation
  let hasNewDependencies = false;
  
  // Clear current dependencies (bidirectional)
  for(const dep of copy.dependencies) {
    dep.dependents.delete(copy);
  }
  copy.dependencies.clear();
  
  const trackDependency = (targetCopy: DependencyCopy<any>) => {
    // Already processed in this computation
    if (copy.dependencies.has(targetCopy)) {
      return;
    }
    
    // Check if this is a new dependency
    if (!remainingDependencies.has(targetCopy)) {
      hasNewDependencies = true;
    } else {
      remainingDependencies.delete(targetCopy);
    }
    
    copy.dependencies.add(targetCopy);
    targetCopy.dependents.add(copy);
  };
  
  const getter = <V>(target: DependencyState<V>): V => {
    const targetCopy = store.copyStore.getCopy(target);
    
    // If the dependency is also dirty, process it first
    if (targetCopy.kind === 'computed' && store.valueDirty.has(targetCopy)) {
      recomputeDependent(targetCopy);
      store.valueDirty.delete(targetCopy);
    }
    
    trackDependency(targetCopy);
    return targetCopy.value;
  };
  
  const hasChanges = () => hasNewDependencies || remainingDependencies.size > 0;
  
  return { getter, hasChanges };
}

export function createRecomputeDependent(store: AtomicContextStore) {
  const { copyStore, dependencyDirty, valueChangedDirty } = store;
  
  // Forward declaration for recursive call
  let recomputeDependent: (copy: DependentCopy) => void;
  
  recomputeDependent = (copy: DependentCopy) => {
    const { getter, hasChanges } = createDependencyTracker(copy, store, recomputeDependent);
    
    const oldValue = copy.value;
    const newValue = copy.original.compute(getter);
    
    if (hasChanges()) {
      dependencyDirty.add(copy);
    }
    
    if (!copy.original.compare(oldValue, newValue)) {
      copy.value = newValue;
      valueChangedDirty.add(copy);
      
      // Cascade update in copy world
      if (copy.kind === 'computed') {
        for (const dependent of copy.dependents) {
          store.valueDirty.add(dependent);
        }
      }
    }
  };
  
  return recomputeDependent;
}