import { State } from './state';
import { touch } from './touch';

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