import type { AtomicContext, ComputedCopy, StateCopy } from '../atomicContext/index';
import type { State } from '../state';
import { globalCircularDetector } from '../stateUtil/circularDetector';
import { throwDisposedStateError } from '../stateUtil/stateUtil';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { recompute } from './recompute';

function collectNeedsRecomputationInternal(
  computed: ComputedCopy,
  context: AtomicContext,
  collected: Set<ComputedCopy>,
  visited: Set<ComputedCopy>
) {
  if (visited.has(computed)) {
    return;
  }
  visited.add(computed);

  if (context.valueDirty.has(computed)) {
    collected.add(computed);
    return;
  }

  let needsRecompute = false;
  for (const dep of computed.dependencies) {
    if (isComputedCopy(dep)) {
      collectNeedsRecomputationInternal(dep, context, collected, visited);
      if (collected.has(dep)) {
        needsRecompute = true;
      }
    }
  }

  if (needsRecompute) {
    collected.add(computed);
  }
}

function collectNeedsRecomputation(target: ComputedCopy, context: AtomicContext): Set<ComputedCopy> {
  const collected = new Set<ComputedCopy>();
  const visited = new Set<ComputedCopy>();

  collectNeedsRecomputationInternal(target, context, collected, visited);

  return collected;
}

function recomputeCollected(collected: Set<ComputedCopy>, context: AtomicContext) {
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
        recompute(copy, context);
        context.valueDirty.delete(copy);
      }
    }
  } finally {
    detector.exitScope(scope);
  }
}

export function getForRecompute<T>(target: State<T>, context: AtomicContext, dependencyTracker: (targetCopy: StateCopy) => void) {
  const targetCopy = context.copyStore.getCopy(target);

  // For computed, traverse dependencies and recompute what's needed
  if (isComputedCopy(targetCopy)) {
    const needsRecompute = collectNeedsRecomputation(targetCopy, context);
    if (needsRecompute.size > 0) {
      recomputeCollected(needsRecompute, context);
    }
  }

  // Track this as an active dependency
  dependencyTracker(targetCopy);
  return targetCopy.value;
}

export function getForAtomicOperation<T>(state: State<T>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(state);

  if(targetCopy.isDisposed) {
    throwDisposedStateError();
  }

  if (isComputedCopy(targetCopy)) {
    const needsRecompute = collectNeedsRecomputation(targetCopy, context);
    if (needsRecompute.size > 0) {
      recomputeCollected(needsRecompute, context);
    }
  }

  return targetCopy.value;
}
