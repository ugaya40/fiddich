import type { AtomicContext } from '../atomicContext/index';
import type { Cell } from '../state';
import { checkDisposedCopy, markDirectDependentsAsValueDirty } from '../stateUtil/stateUtil';
import { isDisposable } from '../util';
import { disposeForAtomicOperation } from './dispose';

export function setForAtomicOperation<T>(cell: Cell<T>, newValue: T, context: AtomicContext) {
  const { copyStore, valueChangedDirty } = context;
  const copy = copyStore.getCopy(cell);

  if(!context.isCommitting) {
    checkDisposedCopy(copy);
  }

  if (!cell.compare(copy.value, newValue)) {
    const oldValue = copy.value;
    copy.value = newValue;
    valueChangedDirty.add(copy);

    if (isDisposable(oldValue)) {
      disposeForAtomicOperation(oldValue, context);
    }

    markDirectDependentsAsValueDirty(copy, context);
  }
}
