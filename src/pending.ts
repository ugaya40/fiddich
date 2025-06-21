import { State } from './state';
import { touch } from './touch';

function collectDependentStatesInternal(
  state: State,
  promise: Promise<any>,
  visited: Set<State>,
  states: State[]
): void {
  if (visited.has(state)) {
    return;
  }
  visited.add(state);
  states.push(state);
  
  state.pendingPromise = promise;
  
  for (const dependent of state.dependents) {
    collectDependentStatesInternal(dependent, promise, visited, states);
  }
}

function collectDependentStates(state: State, promise: Promise<any>): State[] {
  const visited = new Set<State>();
  const states: State[] = [];
  collectDependentStatesInternal(state, promise, visited, states);
  return states;
}

export function pending<T>(state: State<T>, promise: Promise<any>): void {
  const states = collectDependentStates(state, promise);
  
  for (const s of states) {
    touch(s);
  }
  
  promise.finally(() => {
    for (const s of states) {
      if (s.pendingPromise === promise) {
        s.pendingPromise = undefined;
      }
    }
  });
}