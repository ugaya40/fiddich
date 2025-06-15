import { AtomicContext } from '../atomicContext';
import { DependentState } from '../state';

export function createPending(context: AtomicContext) {
  const { valueDirty } = context;
  
  return (): DependentState[] => {
    return Array.from(valueDirty).map(copy => copy.original);
  };
}