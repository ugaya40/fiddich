import type { AtomicContext, ComputedCopy, StateCopy } from '../atomicContext/types';
import type { Computed, State } from '../state';
import { globalCircularDetector } from './circularDetector';
import { isComputedCopy } from './typeUtil';

function getForCopy<V>(target: State<V>, dependencies: Set<StateCopy>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(target);
  // Check for circular dependency if target is a computed being initialized
  if (isComputedCopy(targetCopy) && !targetCopy.isInitialized) {
    globalCircularDetector().add('copy-initialize', targetCopy);
  }
  dependencies.add(targetCopy);
  return targetCopy.value;
}

export function initializeComputedCopy<T>(
  copy: ComputedCopy<T>,
  state: Computed,
  context: AtomicContext
): void {
  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);
  detector.add('copy-initialize', copy);

  const dependencies = new Set<StateCopy>();

  try {
    copy.value = state.compute((target) => getForCopy(target, dependencies, context));
  } finally {
    detector.exitScope(scope);
  }

  copy.dependencies = dependencies;

  for (const dep of dependencies) {
    dep.dependents.add(copy);
  }

  // Calculate rank based on dependencies
  copy.rank = dependencies.size > 0 ? Math.max(...[...dependencies].map((d) => d.rank)) + 1 : 0;

  copy.isInitialized = true;
  context.newlyInitialized.add(copy);
}
