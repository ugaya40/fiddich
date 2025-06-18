import { Cell, Computed, DependencyState, State } from './state';
import { get } from './get';
import type { CellCopy, ComputedCopy, StateCopy } from './atomicContext/types';

const computingSet = new Set<Computed<any>>();

export function withCircularDetection<T>(
  state: Computed<T>,
  compute: () => T
): T {
  if (computingSet.has(state)) {
    throw new Error(`Circular dependency detected: ${state.id}`);
  }
  
  computingSet.add(state);
  try {
    return compute();
  } finally {
    computingSet.delete(state);
  }
}

export function initializeComputedState<T>(state: Computed<T>): void {
  initializeComputedStateWithGetter(state, get);
}

export function initializeComputedStateWithGetter<T>(
  state: Computed<T>,
  getFunction: <V>(state: DependencyState<V>) => V
): void {
  if (state.isInitialized) return;
  
  withCircularDetection(state, () => {
    const dependencies = new Set<DependencyState>();
    
    const getter = <V>(target: DependencyState<V>): V => {
      dependencies.add(target);
      return getFunction(target);
    };
    
    state.stableValue = state.compute(getter);
    
    state.dependencies = dependencies;
    for (const dep of dependencies) {
      dep.dependents.add(state);
    }
    
    state.isInitialized = true;
    
    return state.stableValue;
  });
}

/**
 * Type predicate to check if a value is a Cell
 */
export function isCell<T = any>(value: any): value is Cell<T> {
  return value != null && typeof value === 'object' && value.kind === 'cell';
}

/**
 * Type predicate to check if a value is a Computed
 */
export function isComputed<T = any>(value: any): value is Computed<T> {
  return value != null && typeof value === 'object' && value.kind === 'computed';
}

/**
 * Type predicate to check if a value is a State (Cell or Computed)
 */
export function isState<T = any>(value: any): value is State<T> {
  return isCell(value) || isComputed(value);
}

/**
 * Internal type predicate to check if a copy is a CellCopy
 */
export function isCellCopy<T = any>(copy: StateCopy<T>): copy is CellCopy<T> {
  return copy.kind === 'cell';
}

/**
 * Internal type predicate to check if a copy is a ComputedCopy
 */
export function isComputedCopy<T = any>(copy: StateCopy<T>): copy is ComputedCopy<T> {
  return copy.kind === 'computed';
}

/**
 * Batch notifications scheduler
 */
let scheduled = false;
const pendingNotifications: Array<() => void> = [];

export function scheduleNotifications(notifications: Array<() => void>): void {
  pendingNotifications.push(...notifications);
  
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const toExecute = [...pendingNotifications];
      pendingNotifications.length = 0;
      toExecute.forEach(notify => notify());
    });
  }
}