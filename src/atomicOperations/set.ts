import { AtomicContext } from '../atomicContext/index';
import { Cell } from '../state';
import { isDisposable } from '../util';
import { markDirectDependentsAsValueDirty } from '../stateUtil';
import { dispose } from './dispose';

export function setForAtomicOperation<T>(cell: Cell<T>, newValue: T, context: AtomicContext) {
  const { copyStore, valueChangedDirty } = context;
  const copy = copyStore.getCopy(cell);
    
  if (!cell.compare(copy.value, newValue)) {
    const oldValue = copy.value;
    copy.value = newValue;
    valueChangedDirty.add(copy);
    
    if (isDisposable(oldValue)) {
      dispose(oldValue, context);
    }
    
    markDirectDependentsAsValueDirty(copy, context);
  }
}