import type { AtomicContext } from '../atomicContext/index';

export function disposeForAtomicOperation<T extends Disposable>(target: T, context: AtomicContext) {
  const { toDispose } = context;
  toDispose.add(target);
}
