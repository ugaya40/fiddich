import type { State } from './state';
import { initializeComputed } from './stateUtil/initializeComputed';
import { throwDisposedStateError } from './stateUtil/stateUtil';
import { isComputed } from './stateUtil/typeUtil';

export function get<T>(state: State<T>): T {

  if(isComputed(state) && !state.isInitialized) {
    initializeComputed(state);
  }

  if(state.isDisposed) {
    throwDisposedStateError();
  }

  return state.stableValue;
}
