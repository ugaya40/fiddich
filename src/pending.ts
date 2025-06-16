import { State } from './state';

export function pending<T>(state: State<T>, promise: Promise<any>): void {
  const visited = new Set<State>();
  const states: State[] = [];
  
  function collectStates(s: State): void {
    if (visited.has(s)) {
      return;
    }
    visited.add(s);
    states.push(s);
    
    s.pendingPromise = promise;
    
    for (const dependent of s.dependents) {
      collectStates(dependent);
    }
  }
  
  collectStates(state);
  
  promise.finally(() => {
    for (const s of states) {
      if (s.pendingPromise === promise) {
        s.pendingPromise = undefined;
      }
    }
  });
}