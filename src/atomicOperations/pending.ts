import type { AtomicContext } from '../atomicContext/index';
import { pending, type PendingOptions } from '../pending';
import type { State } from '../state';

export interface AtomicPendingOptions extends PendingOptions {
  promise?: Promise<any>;
}

export function pendingForAtomicOperation<T>(
  state: State<T>, 
  context: AtomicContext, 
  options?: AtomicPendingOptions
) {
  const targetPromise = options?.promise || context.atomicUpdatePromise;
  pending(state, targetPromise!, {
    propagate: options?.propagate
  });
}
