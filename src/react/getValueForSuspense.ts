import { State } from '../state';
import { initializeComputed } from '../stateUtil/initializeComputed';
import { isComputed } from '../stateUtil/typeUtil';

export function getValueForSuspense<T>(state: State<T>): T {
  if (state.pendingPromise) {
    throw state.pendingPromise;
  }
  
  if(isComputed(state)) {
    if (!state.isInitialized) {
      initializeComputed(state);
    }
  }

  return state.stableValue;
}