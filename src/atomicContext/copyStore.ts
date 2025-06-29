import type { Cell, Computed, State } from '../state';
import { initializeComputedCopy } from '../stateUtil/initializeComputedCopy';
import { isCell, isCellCopy, isComputed, isComputedCopy } from '../stateUtil/typeUtil';
import { assertUnreachable } from '../util';
import type { AtomicContext } from './index';
import type { CellCopy, ComputedCopy, StateCopy } from './types';

function createCopy<T>(state: Cell<T>): CellCopy<T>;
function createCopy<T>(state: Computed<T>): ComputedCopy<T>;
function createCopy<T>(state: State<T>): StateCopy<T>;
function createCopy<T>(state: State<T>): StateCopy<T> {
  let disposed = state.isDisposed;

  switch (state.kind) {
    case 'cell':
      return {
        id: state.id,
        kind: 'cell',
        original: state,
        value: state.stableValue,
        dependents: new Set(),
        rank: 0, // Cells have rank 0
        get isDisposed() {
          return disposed;
        },
        set isDisposed(val: boolean) {
          disposed = val;
        },
      };

    case 'computed':
      return {
        id: state.id,
        kind: 'computed',
        original: state,
        value: state.stableValue,
        dependents: new Set(),
        dependencies: new Set(),
        isInitialized: state.isInitialized,
        rank: 0, // Will be calculated later based on dependencies
        get isDisposed() {
          return disposed;
        },
        set isDisposed(val: boolean) {
          disposed = val;
        },
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

  const newCopy = createCopy<T>(state);

  // Must add to map immediately to handle recursive dependencies correctly.
  // If we delay this, dependent copies might create duplicate copies of this state.
  copyStoreMap.set(state, newCopy);

  if (isCell(state) && isCellCopy(newCopy)) {
    for (const dependent of state.dependents) {
      newCopy.dependents.add(getCopyInternal(dependent, context));
    }
  } else if (isComputed(state) && isComputedCopy(newCopy)) {
    if (!newCopy.isInitialized) {
      initializeComputedCopy(newCopy, context);
    } else {
      for (const dependent of state.dependents) {
        newCopy.dependents.add(getCopyInternal(dependent, context));
      }
      for (const dependency of state.dependencies) {
        const depCopy = getCopyInternal(dependency, context);
        newCopy.dependencies.add(depCopy);
      }

      // Calculate rank for already initialized computed
      newCopy.rank = newCopy.dependencies.size > 0 ? Math.max(...[...newCopy.dependencies].map((d) => d.rank)) + 1 : 0;
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
