import type { AtomicContext, StateCopy } from '../atomicContext/index';
import { ReactiveCollection } from '../collections';
import type { ValueStates } from '../state';
import { isComputedCopy } from '../stateUtil/typeUtil';

export function touchForAtomicOperation<T>(state: ValueStates<T>, context: AtomicContext) {
  const visited = new Set<StateCopy>();
  const copy = context.copyStore.getCopy(state);
  touchForAtomicOperationInternal(visited, copy, context);
}

function touchForAtomicOperationInternal<T>(visited: Set<StateCopy>, copy: StateCopy<T>, context: AtomicContext) {
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
