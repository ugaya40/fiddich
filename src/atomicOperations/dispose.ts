import { AtomicContext } from '../atomicContext/index';

export function createDispose(context: AtomicContext) {
  const { toDispose } = context;
  
  return <T extends Disposable>(target: T): void => {
    toDispose.add(target);
  };
}