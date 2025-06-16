import { Computed, DependencyState, DependentState, Cell, State } from '../state';
import { assertUnreachable } from '../util';
import { CellCopy, ComputedCopy, DependentCopy, DependencyCopy, StateCopy } from './types';
import { AtomicContext } from './index';
import { withCircularDetection, isCell, isComputed, isComputedCopy } from '../stateUtil';

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
  const copyingStates = new Set<State>();
  
  function getCopy<T>(state: Cell<T>): CellCopy<T>;
  function getCopy<T>(state: Computed<T>): ComputedCopy<T>;
  function getCopy<T>(state: DependentState<T>): DependentCopy<T>;
  function getCopy<T>(state: DependencyState<T>): DependencyCopy<T>;
  function getCopy<T>(state: State<T>): StateCopy<T>
  function getCopy<T>(state: State<T>): StateCopy<T> {
    const existing = copyStoreMap.get(state);
    if(existing) {
      // Circular dependency detection:
      // If we have an existing copy AND the state is still in the middle of the copy process (in copyingStates),
      // it means we're trying to access a state that is currently being copied/initialized.
      // This only happens when there's a circular dependency (e.g., A → B → A).
      const isCircularDependency = 
        isComputed(state) && 
        !state.isInitialized && 
        copyingStates.has(state) &&  // Key check: still in copy process = circular reference
        isComputedCopy(existing) && 
        !existing.isInitialized;
      
      if (isCircularDependency) {
        throw new Error(`Circular dependency detected: ${state.id}`);
      }
      return existing;
    }
    
    copyingStates.add(state);
    
    try {
      const newCopy = createCopy(state);
      copyStoreMap.set(state, newCopy);
      
      if (isCell(state) && newCopy.kind === 'cell') {
        for (const dependent of state.dependents) {
          newCopy.dependents.add(getCopy(dependent));
        }
      } else if (isComputed(state) && newCopy.kind === 'computed') {
        if (!newCopy.isInitialized) {
          const dependencies = new Set<DependencyCopy>();
          
          const copyGetter = <V>(target: DependencyState<V>): V => {
            const targetCopy = getCopy(target);
            dependencies.add(targetCopy);
            return targetCopy.value;
          };
          
          newCopy.value = withCircularDetection(state, () => {
            return state.compute(copyGetter);
          });
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
          context.valueChangedDirty.add(newCopy);
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
    } finally {
      copyingStates.delete(state);
    }
  }
  
  function clear() {
    copyStoreMap.clear();
    copyingStates.clear();
  }
  
  return { getCopy, clear };
}