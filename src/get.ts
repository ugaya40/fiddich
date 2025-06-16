import { DependencyState } from './state';
import { initializeComputedState, isCell, isComputed } from './stateUtil';

export function get<T>(state: DependencyState<T>): T {
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