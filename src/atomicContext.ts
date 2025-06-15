import { Computed, DependencyState, DependentState, Cell, LeafComputed, State } from './state';
import { assertUnreachable } from './util';
import { createGet, createSet, createTouch, createDispose, createPending } from './atomicOperations';
import { createRecomputeDependent } from './atomicOperations/recompute';
import { initializeLeafComputed, initializeComputed } from './get';

export type StateCopyBase<T> = {
  id: string;
  value: T
}

export interface CellCopy<T> extends StateCopyBase<T> {
  kind: 'cell',
  dependents: Set<DependentCopy>,
  valueVersion: number,
  original : Cell<T>,
}

export interface ComputedCopy<T> extends StateCopyBase<T> {
  kind: 'computed',
  dependents: Set<DependentCopy>,
  dependencies: Set<DependencyCopy>,
  dependencyVersion: number,
  original : Computed<T>,
}

export interface LeafComputedCopy<T> extends StateCopyBase<T> {
  kind: 'leafComputed',
  dependencies: Set<DependencyCopy>,
  dependencyVersion: number,
  original : LeafComputed<T>,
}

export type DependencyCopy<T = any> = CellCopy<T> | ComputedCopy<T>;
export type DependentCopy<T = any> = ComputedCopy<T> | LeafComputedCopy<T>;
export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T> | LeafComputedCopy<T>;


export function createStateCopyStore() {
  const copyStore = new Map<State, StateCopy>();

  function createCopy<T>(state: Cell<T>): CellCopy<T>;
  function createCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function createCopy<T>(state: LeafComputed<T>): LeafComputedCopy<T>;
  function createCopy<T>(state: DependentState<T>): DependentCopy<T>;
  function createCopy<T>(state: DependencyState<T>): DependencyCopy<T>;
  function createCopy<T>(state: State<T>): StateCopy<T>
  function createCopy<T>(state: State<T>): StateCopy<T> {
    switch (state.kind) {
      case 'cell':
        return {
          id: state.id,
          kind: 'cell',
          original: state,
          value: state.stableValue,
          dependents: new Set(),
          valueVersion: state.valueVersion
        };
      
      case 'computed':
        return {
          id: state.id,
          kind: 'computed',
          original: state,
          value: state.stableValue,
          dependents: new Set(),
          dependencies: new Set(),
          dependencyVersion: state.dependencyVersion
        };
      
      case 'leafComputed':
        return {
          id: state.id,
          kind: 'leafComputed',
          original: state,
          value: state.stableValue,
          dependencies: new Set(),
          dependencyVersion: state.dependencyVersion
        };
      
      default:
        assertUnreachable(state);
    }
  }

  function buildDependencies<T>(state: State<T>, copy: StateCopy<T>): void {
    if (state.kind === 'cell' && copy.kind === 'cell') {
      for (const dependent of state.dependents) {
        copy.dependents.add(getCopy(dependent));
      }
    } else if (state.kind === 'computed' && copy.kind === 'computed') {
      // Initialize if needed to ensure dependencies are available
      if (!state.isInitialized) {
        initializeComputed(state);
      }
      for (const dependent of state.dependents) {
        copy.dependents.add(getCopy(dependent));
      }
      for (const dependency of state.dependencies) {
        copy.dependencies.add(getCopy(dependency));
      }
    } else if (state.kind === 'leafComputed' && copy.kind === 'leafComputed') {
      // Initialize if needed to ensure dependencies are available
      if (!state.isInitialized) {
        initializeLeafComputed(state);
      }
      for (const dependency of state.dependencies) {
        copy.dependencies.add(getCopy(dependency));
      }
    }
  }

  function getCopy<T>(state: Cell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: LeafComputed<T>): LeafComputedCopy<T>;
  function getCopy<T>(state: DependentState<T>): DependentCopy<T>;
  function getCopy<T>(state: DependencyState<T>): DependencyCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T>
  function getCopy<T>(state: State<T>): StateCopy<T> {
    if(copyStore.has(state)) {
      return copyStore.get(state)!;
    } else {
      const newCopy = createCopy(state);
      copyStore.set(state, newCopy);
      buildDependencies(state, newCopy);
      return newCopy;
    }
  }

  return {
    getCopy
  }
}


export function createAtomicContext() {
  // Computed/LeafComputed copies that need recalculation
  const valueDirty = new Set<DependentCopy>();
  // Copies whose dependencies have changed
  const dependencyDirty = new Set<StateCopy>();
  // Copies whose values have changed (including direct Cell updates)
  const valueChangedDirty = new Set<StateCopy>();

  const copyStore = createStateCopyStore();
  
  const store: AtomicContextStore = { valueDirty, dependencyDirty, valueChangedDirty, copyStore };
  const recomputeDependent = createRecomputeDependent(store);

  const commit = () => {

    for(const copy of valueDirty) {
      if(copy.kind === 'computed' || copy.kind === 'leafComputed') {
        recomputeDependent(copy);
      }
    }

    // Phase 1: Check all versions for concurrent modifications
    for(const copy of valueChangedDirty) {
      const original = copy.original;
      // Only Cell has valueVersion for optimistic concurrency control
      if (copy.kind === 'cell' && original.kind === 'cell' && original.valueVersion !== copy.valueVersion) {
        throw new Error(`Concurrent value modification detected for ${original.id}`);
      }
    }
    
    // Phase 2: Apply all changes and recursively update dependents
    for(const copy of valueChangedDirty) {
      const original = copy.original;
      const prevValue = original.stableValue;
      original.stableValue = copy.value;
      
      // Only Cell has valueVersion
      if (original.kind === 'cell') {
        original.valueVersion++;
      }
      
      if(original.kind === 'leafComputed' && original.changeCallback) {
        original.changeCallback(prevValue, original.stableValue);
      }
      
      // Don't cascade here - already handled in valueDirty processing
    }

    for(const copy of dependencyDirty) {
      if(copy.kind === 'computed' || copy.kind === 'leafComputed') {
        const original = copy.original;
        
        if (original.dependencyVersion !== copy.dependencyVersion) {
          throw new Error(`Concurrent dependency modification detected for ${original.id}`);
        }
        
        for(const oldDependency of original.dependencies) {
          oldDependency.dependents.delete(original);
        }

        original.dependencies = new Set([...copy.dependencies].map(one => one.original));

        for(const newDependency of original.dependencies) {
          newDependency.dependents.add(original);
        }

        original.dependencyVersion++;
      }
    }
  }

  return {
    valueDirty,
    dependencyDirty,
    valueChangedDirty,
    copyStore,
    commit
  }
}

export type AtomicContextStore = {
  valueDirty: Set<DependentCopy>;
  dependencyDirty: Set<StateCopy>;
  valueChangedDirty: Set<StateCopy>;
  copyStore: ReturnType<typeof createStateCopyStore>;
};

export type AtomicContext = ReturnType<typeof createAtomicContext>;

export function createAtomicOperations(context: AtomicContext) {
  return {
    get: createGet(context),
    set: createSet(context),
    touch: createTouch(context),
    dispose: createDispose(context),
    pending: createPending(context)
  };
}
