import type { CellCopy, ComputedCopy, ValueStateCopy } from '../atomicContext';
import { Cell, RefCell } from '../cell';
import type { ReactiveCollection } from '../collections';
import { Computed } from '../computed';
import type { ValueStates } from '../types';

export function isCell<T>(value: ValueStates<T>): value is Cell<T> | RefCell<T>;
export function isCell(value: unknown): value is Cell | RefCell;
export function isCell(value: unknown): value is Cell | RefCell {
  return value != null && typeof value === 'object' && (value as any).kind === 'cell';
}

export function isComputed<T>(value: ValueStates<T>): value is Computed<T>;
export function isComputed(value: unknown): value is Computed;
export function isComputed(value: unknown): value is Computed {
  return value != null && typeof value === 'object' && (value as any).kind === 'computed';
}

export function isValueState(value: unknown): value is ValueStates {
  return isCell(value) || isComputed(value);
}

export function isReactiveCollection(value: unknown): value is ReactiveCollection {
  return value != null && typeof value === 'object' && (value as any).kind === 'collection';
}

export function isStateCopy(value: unknown): value is ValueStateCopy {
  return value != null && typeof value === 'object' && (value as any).original && (value as any).kind;
}

export function isCellCopy<T>(copy: ValueStateCopy<T>): copy is CellCopy<T>;
export function isCellCopy(copy: ValueStateCopy): copy is CellCopy;
export function isCellCopy(copy: ValueStateCopy): copy is CellCopy {
  return copy.kind === 'cell';
}

export function isComputedCopy<T>(copy: ValueStateCopy<T>): copy is ComputedCopy<T>;
export function isComputedCopy(copy: ValueStateCopy): copy is ComputedCopy;
export function isComputedCopy(copy: ValueStateCopy): copy is ComputedCopy {
  return copy.kind === 'computed';
}
