import { Cell, Computed, State } from './state';
import { get } from './get';
import type { CellCopy, ComputedCopy, StateCopy, AtomicContext, AtomicContextStore } from './atomicContext/types';

export function initializeComputedState<T>(state: Computed<T>): void {
  if (state.isInitialized) return;
  
  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);
  
  const dependencies = new Set<State>();
  
  const getter = <V>(target: State<V>): V => {
    dependencies.add(target);
    return get(target);
  };
  
  try {
    detector.add('initialize',state);
    state.stableValue = state.compute(getter);
  }
  finally {
    detector.exitScope(scope)
  }
  
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

/**
 * Mark direct dependents of a state copy as valueDirty
 */
export function markDependentsAsValueDirty(
  copy: StateCopy,
  context: AtomicContextStore
) {
  // Only mark direct dependents (no recursion)
  for (const dependent of copy.dependents) {
    if (isComputedCopy(dependent)) {
      context.valueDirty.add(dependent);
    }
  }
}

/**
 * Recursively mark all dependents as touched
 */
function markDependentsAsTouchedInternal(
  copy: StateCopy,
  context: AtomicContextStore,
  visited: Set<StateCopy>
) {
  if (visited.has(copy)) return;
  visited.add(copy);
  
  for (const dependent of copy.dependents) {
    context.touchedStates.add(dependent);
    // Recursively process
    markDependentsAsTouchedInternal(dependent, context, visited);
  }
}

/**
 * Mark all dependents of a state copy as touched
 */
export function markDependentsAsTouched(
  copy: StateCopy,
  context: AtomicContextStore
) {
  const visited = new Set<StateCopy>();
  markDependentsAsTouchedInternal(copy, context, visited);
}

type CircularDetector = {
  setScope: (obj: {}) => void,
  exitScope: (obj: {}) => void,
  add(targetUnit: string ,target: Computed | ComputedCopy): void,
}


function createCircularDetector() : CircularDetector {
  let rootObject: {} | null = null;
  const map = new Map<string, Set<string>>();

  const add = (targetUnit: string ,target: Computed | ComputedCopy) => {
    let targetSet: Set<string> | undefined = undefined;
    if(!map.has(targetUnit)) {
      targetSet = new Set();
      map.set(targetUnit, targetSet);
    } else {
      targetSet = map.get(targetUnit)!;
    }
    
    if(targetSet.has(target.id)) {
      throw new Error(`Circular dependency detected: ${target.id}`);
    }
    targetSet.add(target.id);
  };
  const setScope = (obj: {}) => {
    if(rootObject == null) {
      rootObject = obj;
    }
  };
  const exitScope = (obj: {}) => {
    if(obj === rootObject) {
      map.clear();
      rootObject = null;
    }
  };
  
  return {
    add,
    setScope,
    exitScope
  }
}

const detector = createCircularDetector();
export function globalCircularDetector() {
  return detector;
}