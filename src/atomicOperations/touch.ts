import { AtomicContext } from '../atomicContext/index';
import { State } from '../state';
import { isCellCopy, isComputedCopy } from '../stateUtil';

export function createTouch(context: AtomicContext) {
  const { copyStore, valueDirty, notificationDirty, touchedStates } = context;
  
  return <T>(state: State<T>): void => {
    const copy = copyStore.getCopy(state);
    
    touchedStates.add(copy);
    
    if (isCellCopy(copy)) {
      notificationDirty.add(copy);
      for (const dependent of copy.dependents) {
        valueDirty.add(dependent);
        touchedStates.add(dependent);
      }
    } else if (isComputedCopy(copy)) {
      valueDirty.add(copy);
    }
  };
}