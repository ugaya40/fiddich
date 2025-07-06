import type { Cell, Computed, State } from '../state';
import { isCellCopy, isComputedCopy } from '../stateUtil/typeUtil';
import { assertUnreachable } from '../util';
import type { AtomicContext } from './index';
import type { CellCopy, ComputedCopy, StateCopy } from './types';

function createCopy<T>(state: Cell<T>): CellCopy<T>;
function createCopy<T>(state: Computed<T>): ComputedCopy<T>;
function createCopy<T>(state: State<T>): StateCopy<T>;
function createCopy<T>(state: State<T>): StateCopy<T> {
  switch (state.kind) {
    case 'cell':
      return {
        id: state.id,
        kind: 'cell',
        original: state,
        value: state.stableValue,
        dependents: new Set(),
        isDisposed: state.isDisposed,
      };
    case 'computed':
      return {
        id: state.id,
        kind: 'computed',
        original: state,
        value: state.stableValue,
        dependents: new Set(),
        dependencies: new Set(),
        isDirty: state.isDirty,
        isDisposed: state.isDisposed,
      };
    default:
      assertUnreachable(state);
  }
}

function getCopyInternal<T>(state: Cell<T>, context: AtomicContext): CellCopy<T>;
function getCopyInternal<T>(state: Computed<T>, context: AtomicContext): ComputedCopy<T>;
function getCopyInternal<T>(state: State<T>, context: AtomicContext): StateCopy<T>;
function getCopyInternal<T>(state: State<T>, context: AtomicContext): StateCopy<T> {
  const { copyStoreMap } = context.copyStore;
  const existing = copyStoreMap.get(state);
  if (existing) {
    return existing;
  }

  const newCopy = createCopy(state);

  // Must add to map immediately to handle recursive dependencies correctly.
  // If we delay this, dependent copies might create duplicate copies of this state.
  copyStoreMap.set(state, newCopy);

  if (isCellCopy(newCopy)) {
    for (const dependent of newCopy.original.dependents) {
      newCopy.dependents.add(getCopyInternal(dependent, context));
    }
  } else if (isComputedCopy(newCopy)) {
    for (const dependent of newCopy.original.dependents) {
      newCopy.dependents.add(getCopyInternal(dependent, context));
    }
    for (const dependency of newCopy.original.dependencies) {
      newCopy.dependencies.add(getCopyInternal(dependency, context));
    }
  }

  return newCopy;
}

export function createCopyStore(context: AtomicContext) {
  const copyStoreMap = new Map<State, StateCopy>();

  function getCopy<T>(state: Cell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T> {
    return getCopyInternal(state, context);
  }

  function clear() {
    copyStoreMap.clear();
  }

  return { copyStoreMap, getCopy, clear };
}
