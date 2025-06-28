import type { AtomicContext } from '../atomicContext/index';
import type { State } from '../state';
import { isState } from '../stateUtil/typeUtil';

function disposeForAtomicOperationInternal<T extends Disposable>(
  target: T,
  context: AtomicContext,
  visited: Set<State>
) {
  const { toDispose, copyStore } = context;

  if (isState(target)) {
    if (visited.has(target)) return;
    visited.add(target);
    
    const copy = copyStore.getCopy(target);
    
    if (copy.isDisposed) return;
    
    copy.isDisposed = true;
    
    toDispose.add(target);

    for (const dependent of copy.dependents) {
      if (!dependent.isDisposed) {
        disposeForAtomicOperationInternal(dependent.original, context, visited);
      }
    }
  } else {
    toDispose.add(target);
  }
}

export function disposeForAtomicOperation<T extends Disposable>(target: T, context: AtomicContext) {
  const visited = new Set<State>();
  disposeForAtomicOperationInternal(target, context, visited);
}
