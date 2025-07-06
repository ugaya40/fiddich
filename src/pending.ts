import { markDirtyRecursive } from './markDirtyRecursive';
import type { State } from './state';
import { isCell, isComputed } from './stateUtil/typeUtil';

export function pending<T>(state: State<T>, promise: Promise<any>): void {
  state.pendingPromise = promise;

  promise.finally(() => {
    if(state.pendingPromise === promise) {
      state.pendingPromise = undefined;
    }
  });

  if(isCell(state)) {
    for(const dependent of state.dependents) {
      markDirtyRecursive(dependent);
    }
  } else if(isComputed(state)) {
    markDirtyRecursive(state);
  }
}
