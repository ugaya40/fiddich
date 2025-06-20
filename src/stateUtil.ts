import { Cell, Computed, State } from './state';
import { get } from './get';
import type { CellCopy, ComputedCopy, StateCopy } from './atomicContext/types';

export function initializeComputedState<T>(state: Computed<T>): void {
  if (state.isInitialized) return;
  
  const dependencies = new Set<State>();
  
  const getter = <V>(target: State<V>): V => {
    dependencies.add(target);
    return get(target);
  };
  
  state.stableValue = state.compute(getter);
  
  state.dependencies = dependencies;
  for (const dep of dependencies) {
    dep.dependents.add(state);
  }
  
  state.isInitialized = true;
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
const pendingNotifications = new Set<() => void>();

export function scheduleNotifications(notifications: Array<() => void>): void {
  notifications.forEach(notify => pendingNotifications.add(notify));
  
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const toExecute = [...pendingNotifications];
      pendingNotifications.clear();
      toExecute.forEach(notify => notify());
    });
  }
}