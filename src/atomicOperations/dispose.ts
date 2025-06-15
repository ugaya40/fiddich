import { AtomicContext } from '../atomicContext';
import { State } from '../state';

export function createDispose(context: AtomicContext) {
  const { copyStore, valueDirty, valueChangedDirty, dependencyDirty } = context;
  
  return <T>(state: State<T>): void => {
    const copy = copyStore.getCopy(state);
    
    // Remove from all dirty sets
    valueDirty.delete(copy as any);
    valueChangedDirty.delete(copy);
    dependencyDirty.delete(copy);
    
    // Clear dependencies
    if (copy.kind === 'computed' || copy.kind === 'leafComputed') {
      for (const dep of copy.dependencies) {
        dep.dependents.delete(copy);
      }
      copy.dependencies.clear();
    }
    
    // Clear dependents
    if (copy.kind === 'cell' || copy.kind === 'computed') {
      for (const dependent of copy.dependents) {
        dependent.dependencies.delete(copy);
      }
      copy.dependents.clear();
    }
  };
}