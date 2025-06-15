import { AtomicContextStore, DependencyCopy, DependentCopy, ComputedCopy, LeafComputedCopy } from '../atomicContext';
import { DependencyState } from '../state';

function createDependencyTracker(copy: ComputedCopy<any> | LeafComputedCopy<any>, copyStore: AtomicContextStore['copyStore']) {
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
    const targetCopy = copyStore.getCopy(target);
    trackDependency(targetCopy);
    return targetCopy.value;
  };
  
  const hasChanges = () => hasNewDependencies || remainingDependencies.size > 0;
  
  return { getter, hasChanges };
}

export function createRecomputeDependent(store: AtomicContextStore) {
  const { copyStore, dependencyDirty, valueChangedDirty } = store;
  
  return (copy: DependentCopy) => {
    const { getter, hasChanges } = createDependencyTracker(copy, copyStore);
    
    const oldValue = copy.value;
    const newValue = copy.original.compute(getter);
    
    if (hasChanges()) {
      copy.dependencyVersion++;
      dependencyDirty.add(copy);
    }
    
    if (!copy.original.compare(oldValue, newValue)) {
      copy.value = newValue;
      copy.valueVersion++;
      valueChangedDirty.add(copy);
    }
  };
}