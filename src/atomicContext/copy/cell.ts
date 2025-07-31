import type { Cell, RefCell } from '../../types';
import type { AtomicContext } from '../types';
import type { ComputedCopy } from './computed';
import type { ValueStateCopyBase } from './types';

export interface CellCopy<T = any> extends ValueStateCopyBase<T> {
  kind: 'cell';
  dependents: Set<ComputedCopy>;
  original: Cell<T> | RefCell<T>;
}

export function createCellCopy<T>(cell: Cell<T> | RefCell<T>, context: AtomicContext): CellCopy<T> {
  const copy: CellCopy<T> = {
    id: cell.id,
    kind: 'cell',
    original: cell,
    value: cell.stableValue,
    dependents: new Set(),
    isDisposed: cell.isDisposed,
  };

  // Register copy immediately to handle circular dependencies
  context.copyStore.registerCopy(cell, copy);

  for (const dependent of cell.dependents) {
    copy.dependents.add(context.copyStore.getCopy(dependent));
  }

  return copy;
}
