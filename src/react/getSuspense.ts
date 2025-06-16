import { State } from '../state';
import { initializeComputedState } from '../stateUtil';

export function getSuspense<T>(state: State<T>): T {
  if (state.pendingPromise) {
    throw state.pendingPromise;
  }
  
  if(state.kind === 'computed') {
    if (!state.isInitialized) {
      initializeComputedState(state);
    }
  }

  return state.stableValue;
}