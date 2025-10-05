import type { CellCopy, ComputedCopy, ReactiveCollectionCopy, StateCopy, ValueStateCopy } from '../atomicContext/copy';
import type { Cell, RefCell } from '../cell';
import type { ReactiveCollection } from '../collections';
import type { Computed } from '../computed';
import type { States, ValueStates } from '../types';

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

export function isState(value: unknown): value is States {
  return isValueState(value) || isReactiveCollection(value);
}

export function isStateCopy(value: unknown): value is StateCopy {
  return value != null && typeof value === 'object' && (value as any).original && (value as any).kind;
}

export function isCellCopy<T>(copy: StateCopy): copy is CellCopy<T>;
export function isCellCopy(copy: StateCopy): copy is CellCopy;
export function isCellCopy(copy: StateCopy): copy is CellCopy {
  return copy.kind === 'cell';
}

export function isComputedCopy<T>(copy: StateCopy): copy is ComputedCopy<T>;
export function isComputedCopy(copy: StateCopy): copy is ComputedCopy;
export function isComputedCopy(copy: StateCopy): copy is ComputedCopy {
  return copy.kind === 'computed';
}

export function isReactiveCollectionCopy(copy: StateCopy): copy is ReactiveCollectionCopy {
  return copy.kind === 'collection';
}
