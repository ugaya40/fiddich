import type { State } from './state';
import { isComputed } from './stateUtil/typeUtil';

function pendingNotifyRecursiveInternal(state: State, visited: Set<State>) {
  if (visited.has(state)) return;
  visited.add(state);

  if (isComputed(state)) {
    const dependencyPromises = state.dependencies
      .values()
      .filter((dep) => dep.pendingPromise != null)
      .map((dep) => dep.pendingPromise!)
      .toArray();

    if (dependencyPromises.length > 0) {
      const aggregatedPromise = Promise.all(dependencyPromises);
      state.pendingPromise = aggregatedPromise;
      aggregatedPromise.finally(() => {
        if (state.pendingPromise === aggregatedPromise) {
          state.pendingPromise = undefined;
        }
      });
    }
  }

  for (const dependent of state.dependents) {
    pendingNotifyRecursiveInternal(dependent, visited);
  }
}

export function pendingNotifyRecursive(state: State) {
  pendingNotifyRecursiveInternal(state, new Set<State>());
}
