import type { AtomicContext, ValueStateCopy } from '../atomicContext';
import { isComputedCopy } from '../stateUtil/typeUtil';
import type { ValueStates } from '../types';

export function touchForAtomicOperation<T>(state: ValueStates<T>, context: AtomicContext) {
  const visited = new Set<ValueStateCopy>();
  const copy = context.copyStore.getCopy(state);
  touchForAtomicOperationInternal(visited, copy, context);
}

function touchForAtomicOperationInternal<T>(visited: Set<ValueStateCopy>, copy: ValueStateCopy<T>, context: AtomicContext) {
  if (visited.has(copy)) return;
  visited.add(copy);

  context.toNotify.add(copy);

  if (isComputedCopy(copy)) {
    copy.isDirty = true;
    context.valueDirty.add(copy);
  }

  for (const dependent of copy.dependents) {
    touchForAtomicOperationInternal(visited, dependent, context);
  }
}
