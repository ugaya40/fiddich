import type { AtomicContext } from '../atomicContext/index';
import { DisposedStateError } from '../errors';
import type { Cell, RefCell } from '../state';
import { isDisposable } from '../util';
import { disposeForAtomicOperation } from './dispose';
import { markDirtyRecursiveForCopy } from './markDirtyRecursiveForCopy';

export function setForAtomicOperation<T>(cell: Cell<T> | RefCell<T>, newValue: T, context: AtomicContext) {
  const { copyStore, valueChanged: valueChangedDirty } = context;
  const copy = copyStore.getCopy(cell);

  if(copy.isDisposed) {
    throw new DisposedStateError();
  }

  if(cell.compare(copy.value, newValue)) return;

  const oldValue = copy.value;
  copy.value = newValue;
  valueChangedDirty.add(copy);

  if (cell.autoDispose && isDisposable(oldValue)) {
    disposeForAtomicOperation(oldValue, context);
  }

  for (const dependent of copy.dependents) {
    markDirtyRecursiveForCopy(dependent, context);
  }
}
