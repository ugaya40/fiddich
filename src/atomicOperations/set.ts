import { AtomicContext } from '../atomicContext';
import { Cell } from '../state';

export function createSet(context: AtomicContext) {
  const { copyStore, valueChangedDirty, valueDirty } = context;
  
  return <T>(cell: Cell<T>, newValue: T): void => {
    const copy = copyStore.getCopy(cell);
    
    if (!cell.compare(copy.value, newValue)) {
      copy.value = newValue;
      valueChangedDirty.add(copy);
      
      // Add dependents to valueDirty
      for (const dependent of copy.dependents) {
        valueDirty.add(dependent);
      }
    }
  };
}