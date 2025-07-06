import { getForAtomicOperation } from ".";
import { State } from "../state";
import { globalCircularDetector } from "../stateUtil/circularDetector";
import { globalCopyDependencyTracker } from "../stateUtil/dependencyTracker";
import { AtomicContext, ComputedCopy } from "../atomicContext/types";

function getForComputeCopy<T>(state: State<T>, owner: ComputedCopy, context: AtomicContext): T {
  const targetCopy = context.copyStore.getCopy(state);

  const tracker = globalCopyDependencyTracker();
  tracker.track(owner, targetCopy);
  return getForAtomicOperation(state, context);
} 

export function computeForCopy(computed: ComputedCopy, context: AtomicContext) {
  const detector = globalCircularDetector();
  const tracker = globalCopyDependencyTracker();
  const scope = {};

  detector.setScope(scope);
  tracker.setScope(scope);

  detector.collect('computeForCopy', computed);

  let newValue;
  try {
    newValue = computed.original.compute((state) => getForComputeCopy(state, computed, context));

    const changes = tracker.getChanges(computed);
    for(const deleted of changes.deleted) {
      computed.dependencies.delete(deleted);
      deleted.dependents.delete(computed);
    }

    for(const added of changes.added) {
      computed.dependencies.add(added);
      added.dependents.add(computed);
    } 

    if(changes.added.length + changes.deleted.length > 0) {
      context.dependencyDirty.add(changes);
    }
  } finally {
    detector.exitScope(scope);
    tracker.exitScope(scope);
  }

  computed.isDirty = false;
  context.valueDirty.delete(computed);

  if(!computed.original.compare(computed.value, newValue)) {
    computed.value = newValue;
    context.valueChanged.add(computed);
  }
}

