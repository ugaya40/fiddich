import { DependencyState } from './state';
import { initializeComputedState } from './stateUtil';
import { assertUnreachable } from './util';

export function get<T>(state: DependencyState<T>): T {
  switch (state.kind) {
    case 'cell':
      return state.stableValue;
    case 'computed':
      if (!state.isInitialized) {
        initializeComputedState(state);
      }
      return state.stableValue;
    default:
      assertUnreachable(state);
  }
}