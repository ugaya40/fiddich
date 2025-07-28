import type { Cell, Computed, RefCell, ValueStates } from '../state';
import { isCell, isComputed } from '../stateUtil/typeUtil';
import type { AtomicContext } from './index';
import type { CellCopy, ComputedCopy, StateCopy } from './copy';
import { createCellCopy } from './copy/cell';
import { createComputedCopy } from './copy/computed';


function getCopyInternal<T>(state: Cell<T> | RefCell<T>, context: AtomicContext): CellCopy<T>;
function getCopyInternal<T>(state: Computed<T>, context: AtomicContext): ComputedCopy<T>;
function getCopyInternal<T>(state: ValueStates<T>, context: AtomicContext): StateCopy<T>;
function getCopyInternal<T>(state: ValueStates<T>, context: AtomicContext): StateCopy<T> {
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
  const copyStoreMap = new Map<ValueStates, StateCopy>();

  function getCopy<T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: ValueStates<T>): StateCopy<T>;
  function getCopy<T>(state: ValueStates<T>): StateCopy<T> {
    return getCopyInternal(state, context);
  }

  function registerCopy(state: ValueStates, copy: StateCopy): void {
    copyStoreMap.set(state, copy);
  }

  function clear() {
    copyStoreMap.clear();
  }

  return { copyStoreMap, getCopy, registerCopy, clear };
}
