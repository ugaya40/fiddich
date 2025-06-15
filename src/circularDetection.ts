import { Computed, LeafComputed } from './state';

// Track currently computing states to detect circular dependencies
const computingSet = new Set<Computed<any> | LeafComputed<any>>();

/**
 * Detect circular dependencies that would cause infinite loops in synchronous compute functions
 * of computed/leafComputed states
 */
export function withCircularDetection<T>(
  state: Computed<T> | LeafComputed<T>,
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