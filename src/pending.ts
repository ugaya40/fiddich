import { State } from './state';

export function pending<T>(state: State<T>, promise: Promise<any>): void {
  const visited = new Set<State>();
  
  function setPending(s: State): void {
    if (visited.has(s)) {
      return;
    }
    visited.add(s);
    
    s.pendingPromise = promise;
    
    if (s.kind === 'cell' || s.kind === 'computed') {
      for (const dependent of s.dependents) {
        setPending(dependent);
      }
    }
    
    promise.finally(() => {
      if (s.pendingPromise === promise) {
        s.pendingPromise = undefined;
      }
    });
  }
  
  setPending(state);
}