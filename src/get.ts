import { State } from './state';
import { initializeComputedState, isCell, isComputed, globalCircularDetector } from './stateUtil';

export function get<T>(state: State<T>): T {
  if (isCell(state)) {
    return state.stableValue;
  } else if (isComputed(state)) {
    if (!state.isInitialized) {
      initializeComputedState(state);
    }
    return state.stableValue;
  }
  
  throw new Error(`Unknown state kind`);
}