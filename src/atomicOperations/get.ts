import type { AtomicContext } from '../atomicContext/index';
import { DisposedStateError } from '../errors';
import type { State } from '../state';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { computeForCopy } from './computeForCopy';

export function getForAtomicOperation<T>(state: State<T>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(state);

  if (targetCopy.isDisposed) {
    throw new DisposedStateError();
  }

  if (isComputedCopy(targetCopy) && targetCopy.isDirty) {
    computeForCopy(targetCopy, context);
  }

  return targetCopy.value;
}
