import { AtomicContext } from '../atomicContext';
import { DependentState } from '../state';

export function createTouch(context: AtomicContext) {
  const { copyStore, valueDirty } = context;
  
  return <T>(state: DependentState<T>): void => {
    const copy = copyStore.getCopy(state);
    valueDirty.add(copy);
  };
}