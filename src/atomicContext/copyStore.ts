import { Cell, RefCell } from '../cell';
import { Computed } from '../computed';
import { isCell, isComputed } from '../stateUtil/typeUtil';
import type { ValueStates } from '../types';
import { type CellCopy, type ComputedCopy, createCellCopy, createComputedCopy, type ValueStateCopy } from './copy';
import type { AtomicContext } from './types';

function getCopyInternal<T>(state: Cell<T> | RefCell<T>, context: AtomicContext): CellCopy<T>;
function getCopyInternal<T>(state: Computed<T>, context: AtomicContext): ComputedCopy<T>;
function getCopyInternal<T>(state: ValueStates<T>, context: AtomicContext): ValueStateCopy<T>;
function getCopyInternal<T>(state: ValueStates<T>, context: AtomicContext): ValueStateCopy<T> {
  const { copyStoreMap } = context.copyStore;
  const existing = copyStoreMap.get(state);
  if (existing) {
    return existing;
  }

  if (isCell(state)) {
    return createCellCopy(state, context);
  } else if (isComputed(state)) {
    return createComputedCopy(state, context);
  } else {
    throw new Error(`Unexpected state kind: ${(state as any).kind}`);
  }
}

export function createCopyStore(context: AtomicContext) {
  const copyStoreMap = new Map<ValueStates, ValueStateCopy>();

  function getCopy<T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: ValueStates<T>): ValueStateCopy<T>;
  function getCopy<T>(state: ValueStates<T>): ValueStateCopy<T> {
    return getCopyInternal(state, context);
  }

  function registerCopy(state: ValueStates, copy: ValueStateCopy): void {
    copyStoreMap.set(state, copy);
  }

  function clear() {
    copyStoreMap.clear();
  }

  return { copyStoreMap, getCopy, registerCopy, clear };
}
