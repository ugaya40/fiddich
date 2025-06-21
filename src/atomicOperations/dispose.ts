import { AtomicContext } from '../atomicContext/index';

export function dispose<T extends Disposable>(target: T, context: AtomicContext) {
  const { toDispose } = context;
  toDispose.add(target);
}