import type { AtomicContext, ComputedCopy } from '../atomicContext/index';
import type { State } from '../state';
import { throwDisposedStateError } from '../stateUtil/throwDisposedStateError';
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

export function collectNeedsRecomputation(target: ComputedCopy, context: AtomicContext): Set<ComputedCopy> {
  const collected = new Set<ComputedCopy>();
  const visited = new Set<ComputedCopy>();

  collectNeedsRecomputationInternal(target, context, collected, visited);

  return collected;
}

export function recomputeCollected(collected: Set<ComputedCopy>, context: AtomicContext) {
  // Sort by rank ascending
  const sorted = [...collected].sort((a, b) => a.rank - b.rank);

  for (const copy of sorted) {
    // Recompute if still valueDirty
    if (context.valueDirty.has(copy)) {
      recompute(copy, context);
      context.valueDirty.delete(copy);
    }
  }
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
