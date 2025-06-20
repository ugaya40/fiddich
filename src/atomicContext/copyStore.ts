import { Computed, Cell, State } from '../state';
import { assertUnreachable } from '../util';
import { CellCopy, ComputedCopy, StateCopy } from './types';
import { AtomicContext } from './index';
import { isCell, isCellCopy, isComputed, isComputedCopy } from '../stateUtil';

function createCopy<T>(state: Cell<T>): CellCopy<T>;
function createCopy<T>(state: Computed<T>): ComputedCopy<T>;
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
        valueVersion: state.valueVersion,
        rank: 0  // Cells have rank 0
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
        rank: 0  // Will be calculated later based on dependencies
      };
    
    default:
      assertUnreachable(state);
  }
}

export function createCopyStore(
  context: Pick<AtomicContext, 'newlyInitialized' | 'valueChangedDirty'>
) {
  const copyStoreMap = new Map<State, StateCopy>();
  
  function getCopy<T>(state: Cell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T>
  function getCopy<T>(state: State<T>): StateCopy<T> {
    const existing = copyStoreMap.get(state);
    if(existing) {
      return existing;
    }

    const newCopy = createCopy(state);
    copyStoreMap.set(state, newCopy);
    
    if (isCell(state) && isCellCopy(newCopy)) {
      for (const dependent of state.dependents) {
        newCopy.dependents.add(getCopy(dependent));
      }
    } else if (isComputed(state) && isComputedCopy(newCopy)) {
      if (!newCopy.isInitialized) {
        const dependencies = new Set<StateCopy>();
        
        const copyGetter = <V>(target: State<V>): V => {
          const targetCopy = getCopy(target);
          dependencies.add(targetCopy);
          return targetCopy.value;
        };
        
        newCopy.value = state.compute(copyGetter);
        newCopy.dependencies = dependencies;
        
        for (const dep of dependencies) {
          dep.dependents.add(newCopy);
        }
        
        // Calculate rank based on dependencies
        newCopy.rank = dependencies.size > 0 
          ? Math.max(...[...dependencies].map(d => d.rank)) + 1
          : 0;
        
        newCopy.isInitialized = true;
        context.newlyInitialized.add(newCopy);
      } else {
        for (const dependent of state.dependents) {
          newCopy.dependents.add(getCopy(dependent));
        }
        for (const dependency of state.dependencies) {
          const depCopy = getCopy(dependency);
          newCopy.dependencies.add(depCopy);
        }
        
        // Calculate rank for already initialized computed
        newCopy.rank = newCopy.dependencies.size > 0
          ? Math.max(...[...newCopy.dependencies].map(d => d.rank)) + 1
          : 0;
      }
    }
    
    return newCopy;
  }
  
  function clear() {
    copyStoreMap.clear();
  }
  
  return { getCopy, clear };
}