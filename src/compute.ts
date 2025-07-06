import { get } from "./get";
import { Computed, State } from "./state";
import { globalCircularDetector } from "./stateUtil/circularDetector";
import { globalDependencyTracker} from "./stateUtil/dependencyTracker";

function getForCompute<T>(state: State<T>, owner: Computed): T {
  const tracker = globalDependencyTracker();
  tracker.track(owner, state);
  return get(state);
} 

export function compute(computed: Computed) {
  const detector = globalCircularDetector();
  const tracker = globalDependencyTracker();
  const scope = {};

  detector.setScope(scope);
  tracker.setScope(scope);

  detector.collect('compute', computed);

  let newValue;
  try {
    newValue = computed.compute((state) => getForCompute(state, computed));

    const changes = tracker.getChanges(computed);
    for(const deleted of changes.deleted) {
      computed.dependencies.delete(deleted);
      deleted.dependents.delete(computed);
    }

    for(const added of changes.added) {
      computed.dependencies.add(added);
      added.dependents.add(computed);
    } 

  } finally {
    detector.exitScope(scope);
    tracker.exitScope(scope);
  }

  const dependencyPromises = computed.dependencies.values()
  .filter(state => state.pendingPromise != null)
  .map(state => state.pendingPromise!)
  .toArray();

  if(dependencyPromises.length != 0) {
    const pendingPromise = Promise.all(dependencyPromises);
    computed.pendingPromise = pendingPromise;
    pendingPromise.finally(() => {
      if(computed.pendingPromise === pendingPromise) {
        computed.pendingPromise = undefined;
      }
    });
  }

  if(!computed.compare(computed.stableValue, newValue)) {
    computed.stableValue = newValue;
    computed.isDirty = false;
  }
}

