import type { AtomicContext, StateCopy } from '../atomicContext/index';
import type { State } from '../state';
import { throwDisposedStateError } from '../stateUtil/stateUtil';
import { isCellCopy, isComputedCopy } from '../stateUtil/typeUtil';

export function touchForAtomicOperation<T>(state: State<T>, context: AtomicContext) {
  const { copyStore, valueDirty, notificationDirty, touchedStates } = context;
  const copy = copyStore.getCopy(state);

  if(copy.isDisposed) {
    throwDisposedStateError();
  }
  
  touchedStates.add(copy);

  if (isCellCopy(copy)) {
    notificationDirty.add(copy);
  } else if (isComputedCopy(copy)) {
    // If initialized in this atomicContext, there's no need to add to valueDirty
    if(copy.original.isInitialized) {
      valueDirty.add(copy);
    }
  }

  for (const dependent of copy.dependents) {
    if (isComputedCopy(dependent)) {
      context.valueDirty.add(dependent);
    }
  }

  propagateTouchedRecursively(copy, context);
}

function propagateTouchedRecursivelyInternal(copy: StateCopy, context: AtomicContext, visited: Set<StateCopy>) {
  if (visited.has(copy)) return;
  visited.add(copy);

  for (const dependent of copy.dependents) {
    context.touchedStates.add(dependent);
    propagateTouchedRecursivelyInternal(dependent, context, visited);
  }
}

export function propagateTouchedRecursively(copy: StateCopy, context: AtomicContext) {
  const visited = new Set<StateCopy>();
  propagateTouchedRecursivelyInternal(copy, context, visited);
}
