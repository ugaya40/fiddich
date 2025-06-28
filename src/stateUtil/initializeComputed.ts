import { get } from '../get';
import type { Computed, State } from '../state';
import { globalCircularDetector } from './circularDetector';
import { checkDisposed } from './stateUtil';

export function initializeComputed<T>(state: Computed<T>): void {
  if (state.isInitialized) return;

  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);

  const dependencies = new Set<State>();

  const getter = <V>(target: State<V>): V => {
    checkDisposed(target);
    dependencies.add(target);
    return get(target);
  };

  try {
    detector.add('initialize', state);
    state.stableValue = state.compute(getter);
  } finally {
    detector.exitScope(scope);
  }

  state.dependencies = dependencies;
  for (const dep of dependencies) {
    dep.dependents.add(state);
  }

  state.isInitialized = true;
}
