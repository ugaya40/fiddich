import { AtomicContext } from '../atomicContext';

export function createDispose(context: AtomicContext) {
  const { toDispose } = context;
  
  return <T extends Disposable>(target: T): void => {
    toDispose.add(target);
  };
}