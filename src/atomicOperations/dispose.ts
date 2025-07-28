import type { AtomicContext } from '../atomicContext/index';
import { isComputedCopy, isValueState } from '../stateUtil/typeUtil';
import { markDirtyRecursiveForCopy } from './markDirtyRecursiveForCopy';

export function disposeForAtomicOperation<T extends Disposable>(target: T, context: AtomicContext) {
  if (isValueState(target)) {
    const copy = context.copyStore.getCopy(target);

    if (copy.isDisposed) return;

    copy.isDisposed = true;

    if (isComputedCopy(copy)) {
      markDirtyRecursiveForCopy(copy, context);
    } else {
      for (const dependent of copy.dependents) {
        markDirtyRecursiveForCopy(dependent, context);
      }
    }
  }

  context.toDispose.add(target);
}
