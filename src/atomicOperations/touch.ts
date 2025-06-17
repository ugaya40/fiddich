import { AtomicContext } from '../atomicContext/index';
import { State } from '../state';
import { isCellCopy, isComputedCopy } from '../stateUtil';

export function createTouch(context: AtomicContext) {
  const { copyStore, valueDirty, valueChangedDirty } = context;
  
  return <T>(state: State<T>): void => {
    const copy = copyStore.getCopy(state);
    
    if (isCellCopy(copy)) {
      if (!copy.original.compare(copy.value, copy.value)) {
        valueChangedDirty.add(copy);
        for (const dependent of copy.dependents) {
          valueDirty.add(dependent);
        }
      }
    } else if (isComputedCopy(copy)) {
      valueDirty.add(copy);
    }
  };
}