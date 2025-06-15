import { Cell, DependentState } from './state';
import { Compare, defaultCompare, generateStateId } from './util';

export function createCell<T>(
  initialValue: T,
  options?: { compare?: Compare<T> }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const cell: Cell<T> = {
    id: generateStateId(),
    kind: 'cell',
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    
    compare,
    
    [Symbol.dispose](): void {
      this.dependents.clear();
      if (this.stableValue && typeof this.stableValue === 'object' && Symbol.dispose in this.stableValue) {
        (this.stableValue as any)[Symbol.dispose]();
      }
    },

    toJSON(): T {
      return this.stableValue;
    },

    valueVersion: 0
  };
  
  return cell;
}