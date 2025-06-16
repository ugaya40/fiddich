import { Computed } from './state';

const computingSet = new Set<Computed<any>>();

/**
 * Detect circular dependencies that would cause infinite loops in synchronous compute functions
 * of computed states
 */
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