import { AtomicContextStore, DependencyCopy, DependentCopy, ComputedCopy } from '../atomicContext';
import { DependencyState } from '../state';

function createDependencyTracker(copy: ComputedCopy<any>, store: AtomicContextStore, recomputeDependent: (copy: DependentCopy) => void) {
  const remainingDependencies = new Set(copy.dependencies);
  let hasNewDependencies = false;
  
  for(const dep of copy.dependencies) {
    dep.dependents.delete(copy);
  }
  copy.dependencies.clear();
  
  const trackDependency = (targetCopy: DependencyCopy<any>) => {
    if (copy.dependencies.has(targetCopy)) {
      return;
    }
    
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
  const { dependencyDirty, valueChangedDirty } = store;
  
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
      
      if (copy.kind === 'computed') {
        for (const dependent of copy.dependents) {
          store.valueDirty.add(dependent);
        }
      }
    }
  };
  
  return recomputeDependent;
}