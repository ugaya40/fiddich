import type { AtomicContext } from '../atomicContext/index';
import { pending } from '../pending';
import type { State } from '../state';

export function pendingForAtomicOperation<T>(
  state: State<T>,
  context: AtomicContext,
  promise?: Promise<any>
) {
  const targetPromise = promise || context.atomicUpdatePromise;

  if (!targetPromise) {
    throw new Error('pending() requires a Promise argument in synchronous atomicUpdate');
  }

  pending(state, targetPromise);
}
