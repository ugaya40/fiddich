import { Computed, DependencyState, DependentState, Cell, State } from '../state';
import { assertUnreachable } from '../util';
import { CellCopy, ComputedCopy, DependentCopy, DependencyCopy, StateCopy } from './types';
import { AtomicContext } from './index';
import { withCircularDetection, isCell, isComputed } from '../stateUtil';

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
        isInitialized: state.isInitialized
      };
    
    default:
      assertUnreachable(state);
  }
}

export function createCopyStore(
  context: Pick<AtomicContext, 'newlyInitialized' | 'valueChangedDirty'>
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
      const existing = copyStoreMap.get(state)!;
      if (isComputed(state) && !state.isInitialized && beingCopied.has(state) && existing.kind === 'computed' && !existing.isInitialized) {
        throw new Error(`Circular dependency detected: ${state.id}`);
      }
      return existing;
    }
    
    if (beingCopied.has(state)) {
      if (isComputed(state) && !state.isInitialized) {
        throw new Error(`Circular dependency detected: ${state.id}`);
      }
      const placeholder = createCopy(state);
      copyStoreMap.set(state, placeholder);
      return placeholder;
    }
    
    beingCopied.add(state);
    
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