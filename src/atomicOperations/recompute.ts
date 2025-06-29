import type { AtomicContext, ComputedCopy, DependencyChanges } from '../atomicContext/index';
import type { State } from '../state';
import { globalCircularDetector } from '../stateUtil/circularDetector';
import { globalDependencyTracker } from '../stateUtil/dependencyTracker';
import { isComputedCopy } from '../stateUtil/typeUtil';
import { recomputeIfNeed } from './recomputeIfNeed';
import { propagateTouchedRecursively } from './touch';

export function getForRecompute<T>(target: State<T>, context: AtomicContext, owner: ComputedCopy) {
  const targetCopy = context.copyStore.getCopy(target);

  // For computed, traverse dependencies and recompute what's needed
  if (isComputedCopy(targetCopy)) {
    recomputeIfNeed(targetCopy, context);
  }

  // Track this as an active dependency
  globalDependencyTracker().track(owner, targetCopy);
  return targetCopy.value;
}

export function recompute(copy: ComputedCopy, context: AtomicContext) {
  const { dependencyDirty, valueChangedDirty, notificationDirty, touchedStates } = context;

  const detector = globalCircularDetector();
  const tracker = globalDependencyTracker();
  const scope = {};
  tracker.setScope(scope);
  detector.setScope(scope);

  detector.collect('recompute', copy);

  const oldValue = copy.value;
  let newValue: any;
  let dependencyChanges: DependencyChanges;
  try {
    newValue = copy.original.compute(<T>(state: State<T>) => getForRecompute(state, context, copy));
  } finally {
    detector.exitScope(scope);
    dependencyChanges = tracker.exitScope(scope)!;
  }
  
  const {changes} = dependencyChanges;

  if (changes && (changes.added.length + changes.deleted.length) > 0) {
    dependencyDirty.add(dependencyChanges);

    // Update rank based on new dependencies
    const newRank = copy.dependencies.size > 0 ? Math.max(...[...copy.dependencies].map((d) => d.rank)) + 1 : 0;

    if (newRank > copy.rank) {
      copy.rank = newRank;
      // Note: We don't need to propagate rank updates to dependents
      // because they will be recalculated when processed
    }
  }

  const isTouched = touchedStates.has(copy);
  const hasValueChanged = !copy.original.compare(oldValue, newValue);

  if (hasValueChanged) {
    copy.value = newValue;
    valueChangedDirty.add(copy);

    for (const dependent of copy.dependents) {
      if (isComputedCopy(dependent)) {
        context.valueDirty.add(dependent);
      }
    }
    
  }

  if (isTouched) {
    if (!hasValueChanged) {
      notificationDirty.add(copy);
      for (const dependent of copy.dependents) {
        if (isComputedCopy(dependent)) {
          context.valueDirty.add(dependent);
        }
      }
    }

    propagateTouchedRecursively(copy, context);
  }
}
