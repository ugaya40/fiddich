import { State } from '../state';
import { initializeComputedState, isComputed } from '../stateUtil';

export function getSuspense<T>(state: State<T>): T {
  if (state.pendingPromise) {
    throw state.pendingPromise;
  }
  
  if(isComputed(state)) {
    if (!state.isInitialized) {
      initializeComputedState(state);
    }
  }

  return state.stableValue;
}