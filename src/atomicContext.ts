import { Computed, DependencyState, DependentState, Cell, LeafComputed, State } from './state';
import { assertUnreachable } from './util';
import { createGet, createSet, createTouch, createDispose, createPending } from './atomicOperations';
import { createRecomputeDependent } from './atomicOperations/recompute';

export type StateCopyBase<T> = {
  id: string;
  value: T,
  dependencyVersion : number,
  valueVersion: number 
}

export interface CellCopy<T> extends StateCopyBase<T> {
  kind: 'cell',
  dependents: Set<DependentCopy>
  original : Cell<T>,
}

export interface ComputedCopy<T> extends StateCopyBase<T> {
  kind: 'computed',
  dependents: Set<DependentCopy>,
  dependencies: Set<DependencyCopy>,
  original : Computed<T>,
}

export interface LeafComputedCopy<T> extends StateCopyBase<T> {
  kind: 'leafComputed',
  dependencies: Set<DependencyCopy>,
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
          dependents: new Set([...state.dependents].map(one => getCopy(one))),
          valueVersion: state.valueVersion,
          dependencyVersion: state.dependencyVersion
        };
      
      case 'computed':
        return {
          id: state.id,
          kind: 'computed',
          original: state,
          value: state.stableValue,
          dependents: new Set([...state.dependents].map(one => getCopy(one))),
          dependencies: new Set([...state.dependencies].map(one => getCopy(one))),
          valueVersion: state.valueVersion,
          dependencyVersion: state.dependencyVersion
        };
      
      case 'leafComputed':
        return {
          id: state.id,
          kind: 'leafComputed',
          original: state,
          value: state.stableValue,
          dependencies: new Set([...state.dependencies].map(one => getCopy(one))),
          valueVersion: state.valueVersion,
          dependencyVersion: state.dependencyVersion
        };
      
      default:
        assertUnreachable(state);
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
      return newCopy
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

    for(const copy of valueChangedDirty) {
      const original = copy.original;
      
      if (original.valueVersion !== copy.valueVersion) {
        throw new Error(`Concurrent value modification detected for ${original.id}`);
      }

      const prevValue = original.stableValue;
      original.stableValue = copy.value;
      original.valueVersion = copy.valueVersion;
      if(original.kind === 'leafComputed' && original.changeCallback) {
        original.changeCallback(prevValue, original.stableValue);
      }
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

        original.dependencyVersion = copy.dependencyVersion;
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
