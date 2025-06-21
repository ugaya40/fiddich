import { State } from './state';
import { initializeComputed } from './stateUtil/initializeComputed';
import { isCell, isComputed } from './stateUtil/typeUtil';

export function get<T>(state: State<T>): T {
  if (isCell(state)) {
    return state.stableValue;
  } else if (isComputed(state)) {
    if (!state.isInitialized) {
      initializeComputed(state);
    }
    return state.stableValue;
  }
  
  throw new Error(`Unknown state kind`);
}