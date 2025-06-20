import { AtomicContext, AtomicContextStore, ComputedCopy } from '../atomicContext/index';
import { State } from '../state';
import { isComputedCopy, globalCircularDetector } from '../stateUtil';
import { createRecomputeComputed } from './recompute';

// Internal function to collect computeds recursively
function collectNeedsRecomputationInternal(
  computed: ComputedCopy,
  context: AtomicContextStore,
  collected: Set<ComputedCopy>,
  visited: Set<ComputedCopy>
) {
  // Prevent infinite loops in circular dependencies
  if (visited.has(computed)) {
    return;
  }
  visited.add(computed);
  
  // If already valueDirty, collect and stop
  if (context.valueDirty.has(computed)) {
    collected.add(computed);
    return;
  }
  
  // Check dependencies recursively
  let needsRecompute = false;
  for (const dep of computed.dependencies) {
    if (isComputedCopy(dep)) {
      collectNeedsRecomputationInternal(dep, context, collected, visited);
      // If dependency needs recompute, so does this
      if (collected.has(dep)) {
        needsRecompute = true;
      }
    }
  }
  
  if (needsRecompute) {
    collected.add(computed);
  }
}

// Collect computeds that need recomputation by traversing dependencies
function collectNeedsRecomputation(
  target: ComputedCopy,
  context: AtomicContextStore
): Set<ComputedCopy> {
  const collected = new Set<ComputedCopy>();
  const visited = new Set<ComputedCopy>();
  
  collectNeedsRecomputationInternal(target, context, collected, visited);
  
  return collected;
}

// Recompute collected computeds in rank order
function recomputeCollected(
  collected: Set<ComputedCopy>,
  context: AtomicContextStore,
  recompute: (copy: ComputedCopy) => void
) {
  // Sort by rank ascending
  const sorted = [...collected].sort((a, b) => a.rank - b.rank);
  
  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);
  
  try {
    for (const copy of sorted) {
      // Recompute if still valueDirty
      if (context.valueDirty.has(copy)) {
        detector.add('recompute', copy);
        recompute(copy);
        context.valueDirty.delete(copy);
      }
    }
  } finally {
    detector.exitScope(scope);
  }
}

export function createInnerGet(
  context: AtomicContextStore,
  trackDependency: (targetCopy: any) => void,
  recomputeComputed: (copy: any) => void
) {
  return <V>(target: State<V>): V => {
    const targetCopy = context.copyStore.getCopy(target);
    
    // For computed, traverse dependencies and recompute what's needed
    if (isComputedCopy(targetCopy)) {
      const needsRecompute = collectNeedsRecomputation(targetCopy, context);
      if (needsRecompute.size > 0) {
        recomputeCollected(needsRecompute, context, recomputeComputed);
      }
    }
    
    // Track this as an active dependency
    trackDependency(targetCopy);
    return targetCopy.value;
  };
}

export function createGet(context: AtomicContext) {
  const recompute = createRecomputeComputed(context);
  
  const get = <T>(state: State<T>): T => {
    const targetCopy = context.copyStore.getCopy(state);
    
    if (isComputedCopy(targetCopy)) {
      const needsRecompute = collectNeedsRecomputation(targetCopy, context);
      if (needsRecompute.size > 0) {
        recomputeCollected(needsRecompute, context, recompute);
      }
    }
    
    return targetCopy.value;
  };
  
  return get;
}