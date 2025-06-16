import { AtomicContext } from '../atomicContext';
import { Cell } from '../state';
import { isDisposable } from '../util';
import { createDispose } from './dispose';

export function createSet(context: AtomicContext) {
  const { copyStore, valueChangedDirty, valueDirty } = context;
  const dispose = createDispose(context);
  
  return <T>(cell: Cell<T>, newValue: T): void => {
    const copy = copyStore.getCopy(cell);
    
    if (!cell.compare(copy.value, newValue)) {
      const oldValue = copy.value;
      copy.value = newValue;
      valueChangedDirty.add(copy);
      
      if (isDisposable(oldValue)) {
        dispose(oldValue);
      }
      
      for (const dependent of copy.dependents) {
        valueDirty.add(dependent);
      }
    }
  };
}