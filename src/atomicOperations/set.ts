import { AtomicContext } from '../atomicContext/index';
import { Cell } from '../state';
import { isDisposable } from '../util';
import { createDispose } from './dispose';
import { markDependentsAsValueDirty } from '../stateUtil';

export function createSet(context: AtomicContext) {
  const { copyStore, valueChangedDirty } = context;
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
      
      markDependentsAsValueDirty(copy, context);
    }
  };
}