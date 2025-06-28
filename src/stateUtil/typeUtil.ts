import type { CellCopy, ComputedCopy, StateCopy } from '../atomicContext';
import type { Cell, Computed, State } from '../state';

export function isCell<T = unknown>(value: any): value is Cell<T> {
  return value != null && typeof value === 'object' && value.kind === 'cell';
}

export function isComputed<T = unknown>(value: any): value is Computed<T> {
  return value != null && typeof value === 'object' && value.kind === 'computed';
}

export function isState<T = unknown>(value: any): value is State<T> {
  return isCell(value) || isComputed(value);
}

export function isStateCopy<T = unknown>(value: any): value is StateCopy<T> {
  return value != null && typeof value === 'object' && value.original && value.kind;
}

export function isCellCopy<T = unknown>(copy: StateCopy<T>): copy is CellCopy<T> {
  return copy.kind === 'cell';
}

export function isComputedCopy<T = unknown>(copy: StateCopy<T>): copy is ComputedCopy<T> {
  return copy.kind === 'computed';
}
