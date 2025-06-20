import { AtomicContext } from '../atomicContext/index';
import { State } from '../state';
import { isCellCopy, isComputedCopy, markDependentsAsValueDirty, markDependentsAsTouched } from '../stateUtil';

export function createTouch(context: AtomicContext) {
  const { copyStore, valueDirty, notificationDirty, touchedStates } = context;
  
  return <T>(state: State<T>): void => {
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
    markDependentsAsValueDirty(copy, context);
    markDependentsAsTouched(copy, context);
  };
}