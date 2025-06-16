import { Computed, DependencyState, DependentState, Cell, State } from '../state';
import { assertUnreachable } from '../util';
import { CellCopy, ComputedCopy, DependentCopy, DependencyCopy, StateCopy } from './types';
import { AtomicContext } from './index';

function createCopy<T>(state: Cell<T>): CellCopy<T>;
function createCopy<T>(state: Computed<T>): ComputedCopy<T>;
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
        dependencyVersion: state.dependencyVersion,
        isInitialized: state.isInitialized,
        compute: state.isInitialized ? undefined : state.compute
      };
    
    default:
      assertUnreachable(state);
  }
}

export function createCopyStore(
  context: Pick<AtomicContext, 'newlyInitialized' | 'valueChangedDirty'>,
  contextGetter: <V>(state: DependencyState<V>) => V
) {
  const copyStoreMap = new Map<State, StateCopy>();
  const beingCopied = new Set<State>();
  
  function getCopy<T>(state: Cell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: DependentState<T>): DependentCopy<T>;
  function getCopy<T>(state: DependencyState<T>): DependencyCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T>
  function getCopy<T>(state: State<T>): StateCopy<T> {
    if(copyStoreMap.has(state)) {
      return copyStoreMap.get(state)!;
    }
    
    // Check if we're already copying this state (circular reference)
    if (beingCopied.has(state)) {
      // Create a placeholder copy to break the cycle
      const placeholder = createCopy(state);
      copyStoreMap.set(state, placeholder);
      return placeholder;
    }
    
    beingCopied.add(state);
    
    try {
      const newCopy = createCopy(state);
      copyStoreMap.set(state, newCopy);
      
      if (state.kind === 'cell' && newCopy.kind === 'cell') {
        for (const dependent of state.dependents) {
          newCopy.dependents.add(getCopy(dependent));
        }
      } else if (state.kind === 'computed' && newCopy.kind === 'computed') {
        if (!newCopy.isInitialized && newCopy.compute) {
          const dependencies = new Set<DependencyCopy>();
          
          const copyGetter = <V>(target: DependencyState<V>): V => {
            const targetCopy = getCopy(target);
            dependencies.add(targetCopy);
            return targetCopy.value;
          };
          
          newCopy.value = newCopy.compute(copyGetter);
          newCopy.dependencies = dependencies;
          
          for (const dep of dependencies) {
            dep.dependents.add(newCopy);
          }
          
          newCopy.isInitialized = true;
          context.newlyInitialized.add(newCopy);
          context.valueChangedDirty.add(newCopy);
        } else {
          for (const dependent of state.dependents) {
            newCopy.dependents.add(getCopy(dependent));
          }
          for (const dependency of state.dependencies) {
            newCopy.dependencies.add(getCopy(dependency));
          }
        }
      }
      
      return newCopy;
    } finally {
      beingCopied.delete(state);
    }
  }
  
  return { getCopy };
}