import type { AtomicContext } from '../atomicContext/index';
import { ReactiveCollection } from '../collections';
import { type PendingOptions, pending } from '../pending';
import type { States, ValueStates } from '../state';

export interface AtomicPendingOptions extends PendingOptions {
  promise?: Promise<any>;
}

export function pendingForAtomicOperation(state: States, context: AtomicContext, options?: AtomicPendingOptions) {
  const targetPromise = options?.promise || context.atomicUpdatePromise;
  pending(state, targetPromise!, {
    propagate: options?.propagate,
  });
}
