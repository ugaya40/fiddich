import { CellCopy, ComputedCopy, StateCopy } from "../atomicContext";
import { Cell, Computed, State } from "../state";

export function isCell<T = any>(value: any): value is Cell<T> {
  return value != null && typeof value === 'object' && value.kind === 'cell';
}

export function isComputed<T = any>(value: any): value is Computed<T> {
  return value != null && typeof value === 'object' && value.kind === 'computed';
}

export function isState<T = any>(value: any): value is State<T> {
  return isCell(value) || isComputed(value);
}

export function isCellCopy<T = any>(copy: StateCopy<T>): copy is CellCopy<T> {
  return copy.kind === 'cell';
}

export function isComputedCopy<T = any>(copy: StateCopy<T>): copy is ComputedCopy<T> {
  return copy.kind === 'computed';
}