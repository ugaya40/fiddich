import type { Cell, RefCell } from '../cell';
import type { ReactiveCollections } from '../collections';
import type { Computed } from '../computed';
import { isCell, isComputed, isReactiveCollection } from '../stateUtil/typeUtil';
import type { States, ValueStateBase, ValueStates } from '../types';
import { type CellCopy, type ComputedCopy, createCellCopy, createCollectionCopy, createComputedCopy, type ReactiveCollectionCopy, type StateCopy, ValueStateCopy } from './copy';
import type { AtomicContext } from './types';

function getCopyInternal<T>(state: Cell<T> | RefCell<T>, context: AtomicContext): CellCopy<T>;
function getCopyInternal<T>(state: Computed<T>, context: AtomicContext): ComputedCopy<T>;
function getCopyInternal(state: ValueStates, context: AtomicContext): ValueStateCopy;
function getCopyInternal(state: ReactiveCollections, context: AtomicContext): ReactiveCollectionCopy;
function getCopyInternal(state: States, context: AtomicContext): StateCopy;
function getCopyInternal(state: States, context: AtomicContext): StateCopy {
  const { copyStoreMap } = context.copyStore;
  const existing = copyStoreMap.get(state);
  if (existing) {
    return existing;
  }

  if (isCell(state)) {
    return createCellCopy(state, context);
  } else if (isComputed(state)) {
    return createComputedCopy(state, context);
  } else if (isReactiveCollection(state)) {
    return createCollectionCopy(state, context);
  } else {
    throw new Error(`Unexpected state kind: ${(state as any).kind}`);
  }
}

export function createCopyStore(context: AtomicContext) {
  const copyStoreMap = new Map<States, StateCopy>();

  function getCopy<T>(state: Cell<T> | RefCell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy(state: ValueStates): ValueStateCopy;
  function getCopy(state: ReactiveCollections): ReactiveCollectionCopy;
  function getCopy(state: States): StateCopy;
  function getCopy(state: States): StateCopy {
    return getCopyInternal(state, context);
  }

  function registerCopy(state: States, copy: StateCopy): void {
    copyStoreMap.set(state, copy);
  }

  function clear() {
    copyStoreMap.clear();
  }

  return { copyStoreMap, getCopy, registerCopy, clear };
}
