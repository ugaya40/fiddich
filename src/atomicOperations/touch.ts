import { AtomicContext } from '../atomicContext/index';
import { State } from '../state';

export function createTouch(context: AtomicContext) {
  const { copyStore, valueDirty, valueChangedDirty } = context;
  
  return <T>(state: State<T>): void => {
    const copy = copyStore.getCopy(state);
    
    if (copy.kind === 'cell') {
      valueChangedDirty.add(copy);
      for (const dependent of copy.dependents) {
        valueDirty.add(dependent);
      }
    } else if (copy.kind === 'computed') {
      valueDirty.add(copy);
    }
  };
}