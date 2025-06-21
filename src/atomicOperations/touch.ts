import { AtomicContext, AtomicContextStore, StateCopy } from '../atomicContext/index';
import { State } from '../state';
import { markDirectDependentsAsValueDirty } from '../stateUtil';
import { isCellCopy, isComputedCopy } from '../stateUtil/typeUtil';

export function touchForAtomicOperation<T>(state: State<T>, context: AtomicContext) {
  const { copyStore, valueDirty, notificationDirty, touchedStates } = context;
  const copy = copyStore.getCopy(state);
    
  // Mark self as touched
  touchedStates.add(copy);
  
  // Mark self appropriately
  if (isCellCopy(copy)) {
    notificationDirty.add(copy);
  } else if (isComputedCopy(copy)) {
    valueDirty.add(copy);
  }
  
  // Mark all dependents
  markDirectDependentsAsValueDirty(copy, context);
  propagateTouchedRecursively(copy, context);
}

function propagateTouchedRecursivelyInternal(
  copy: StateCopy,
  context: AtomicContextStore,
  visited: Set<StateCopy>
) {
  if (visited.has(copy)) return;
  visited.add(copy);
  
  for (const dependent of copy.dependents) {
    context.touchedStates.add(dependent);
    // Recursively process
    propagateTouchedRecursivelyInternal(dependent, context, visited);
  }
}

export function propagateTouchedRecursively(
  copy: StateCopy,
  context: AtomicContextStore
) {
  const visited = new Set<StateCopy>();
  propagateTouchedRecursivelyInternal(copy, context, visited);
}