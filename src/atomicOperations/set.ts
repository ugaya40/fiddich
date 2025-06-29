import type { AtomicContext } from '../atomicContext/index';
import type { Cell } from '../state';
import { throwDisposedStateError } from '../stateUtil/stateUtil';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { isDisposable } from '../util';
import { disposeForAtomicOperation } from './dispose';

export function setForAtomicOperation<T>(cell: Cell<T>, newValue: T, context: AtomicContext) {
  const { copyStore, valueChangedDirty } = context;
  const copy = copyStore.getCopy(cell);

  if(copy.isDisposed) {
    throwDisposedStateError();
  }

  if (!cell.compare(copy.value, newValue)) {
    const oldValue = copy.value;
    copy.value = newValue;
    valueChangedDirty.add(copy);

    if (isDisposable(oldValue)) {
      disposeForAtomicOperation(oldValue, context);
    }

    for (const dependent of copy.dependents) {
      if (isComputedCopy(dependent)) {
        context.valueDirty.add(dependent);
      }
    }
  }
}
