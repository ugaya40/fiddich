import { get } from '../get';
import type { Computed, State } from '../state';
import { globalCircularDetector } from './circularDetector';

import { isComputed } from './typeUtil';

export function getForInitializeComputed<T,V>(target: State<V>, owner: Computed<T>) {
  if(isComputed(target) && !target.isInitialized) {
    initializeComputed(target);
  }

  if(target.isDisposed && !owner.isDisposed) {
    owner.isDisposed = true;
  }

  owner.dependencies.add(target);
  target.dependents.add(owner);
  return target.stableValue;
}

export function initializeComputed<T>(state: Computed<T>): void {
  if (state.isInitialized) return;

  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);

  detector.collect('initialize', state);

  try {
    state.stableValue = state.compute((target) => getForInitializeComputed(target, state));
  } catch(error) {
    for(const dep of state.dependencies) {
      dep.dependents.delete(state);
    }
    state.dependencies.clear();
    throw error;
  }
  finally {
    detector.exitScope(scope);
  }

  state.isInitialized = true;
}
