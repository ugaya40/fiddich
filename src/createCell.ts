import { Cell, DependentState } from './state';
import { Compare, defaultCompare, generateStateId, isDisposable } from './util';

export function createCell<T>(
  initialValue: T,
  options?: { compare?: Compare<T> }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const current: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    
    compare,
    
    [Symbol.dispose](): void {
      current.dependents.clear();
      if (isDisposable(current.stableValue)) {
        current.stableValue[Symbol.dispose]();
      }
    },

    toJSON(): T {
      return current.stableValue;
    },

    valueVersion: 0
  };
  
  return current;
}