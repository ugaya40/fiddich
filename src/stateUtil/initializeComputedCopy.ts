import type { AtomicContext, ComputedCopy, StateCopy } from '../atomicContext/types';
import type { State } from '../state';
import { globalCircularDetector } from './circularDetector';
import { isComputedCopy } from './typeUtil';

function getForInitializeComputedCopy<T, V>(target: State<V>, owner: ComputedCopy<T>, context: AtomicContext) {
  const targetCopy = context.copyStore.getCopy(target);

  if (isComputedCopy(targetCopy) && !targetCopy.isInitialized) {
    globalCircularDetector().add('copy-initialize', targetCopy);
  }

  if(targetCopy.isDisposed && !owner.isDisposed) {
    owner.isDisposed = true;
  }

  owner.dependencies.add(targetCopy);
  targetCopy.dependents.add(owner);

  return targetCopy.value;
}

export function initializeComputedCopy<T>(copy: ComputedCopy<T>, context: AtomicContext): void {
  const detector = globalCircularDetector();
  const scope = {};
  detector.setScope(scope);
  detector.add('copy-initialize', copy);

  try {
    copy.value = copy.original.compute((target) => getForInitializeComputedCopy(target, copy, context));
  } catch(error) {
    for(const dep of copy.dependencies) {
      dep.dependents.delete(copy);
    }
    copy.dependencies.clear();
    throw error;
  }
   finally {
    detector.exitScope(scope);
  }

  // Calculate rank based on dependencies
  copy.rank = copy.dependencies.size > 0 ? Math.max(...[...copy.dependencies].map((d) => d.rank)) + 1 : 0;

  copy.isInitialized = true;
  context.newlyInitialized.add(copy);
}
