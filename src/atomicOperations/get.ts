import type { AtomicContext } from '../atomicContext/index';
import type { State } from '../state';
import { throwDisposedStateError } from '../stateUtil/throwDisposedStateError';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { recomputeIfNeed } from './recomputeIfNeed';

export function getForAtomicOperation<T>(state: State<T>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(state);

  if(targetCopy.isDisposed) {
    throwDisposedStateError();
  }

  if (isComputedCopy(targetCopy)) {
    recomputeIfNeed(targetCopy, context);
  }

  return targetCopy.value;
}
