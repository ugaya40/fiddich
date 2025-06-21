import type { AtomicContext } from '../atomicContext/index';
import type { Cell } from '../state';
import { markDirectDependentsAsValueDirty } from '../stateUtil';
import { isDisposable } from '../util';
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
