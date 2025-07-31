import { pendingNotifyRecursive } from './pendingNotifyRecursive';
import type { States } from './types';

export interface PendingOptions {
  propagate?: boolean;
}

export function pending(state: States, promise: Promise<any>, options?: PendingOptions): void {
  state.pendingPromise = promise;

  promise.finally(() => {
    if (state.pendingPromise === promise) {
      state.pendingPromise = undefined;
    }
  });

  // Propagate to dependents if requested (default: false)
  if (options?.propagate) {
    for (const dependent of state.dependents) {
      pendingNotifyRecursive(dependent);
    }
  }
}
