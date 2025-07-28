import type { AtomicContext } from '../atomicContext/index';
import { DisposedStateError } from '../errors';
import type { ValueStates } from '../state';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { computeForCopy } from './computeForCopy';

export function getForAtomicOperation<T>(state: ValueStates<T>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(state);

  if (targetCopy.isDisposed) {
    throw new DisposedStateError();
  }

  if (isComputedCopy(targetCopy) && targetCopy.isDirty) {
    computeForCopy(targetCopy, context);
  }

  return targetCopy.value;
}
