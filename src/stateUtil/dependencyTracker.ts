import type { ComputedCopy, StateCopy } from '../atomicContext';
import type { Computed, State } from '../state';
import { createScopedCollector, type ScopedCollector } from '../util';

export type OriginalState = {
  computed: Computed;
  state: State;
};

export type CopyState = {
  computed: ComputedCopy;
  state: StateCopy;
};

type ContextComputed<T extends OriginalState | CopyState> = T['computed'];
type ContextState<T extends OriginalState | CopyState> = T['state'];

export type DependencyChanges<T extends OriginalState | CopyState> = {
  remainingOldDependencies: Set<ContextState<T>>;
  added: ContextState<T>[];
};

export type DependencyChangeSet<T extends OriginalState | CopyState> = {
  computed: ContextComputed<T>;
  added: ContextState<T>[];
  deleted: ContextState<T>[];
};

type DependencyTracker<T extends OriginalState | CopyState> = {
  setScope: (scope: Record<string, never>) => void;
  exitScope: (scope: Record<string, never>) => void;
  getChanges: (computed: ContextComputed<T>) => DependencyChangeSet<T>;
  track: (computed: ContextComputed<T>, dependency: ContextState<T>) => void;
};

function createDependencyTracker<T extends OriginalState | CopyState>(): DependencyTracker<T> {
  const collector: ScopedCollector<ContextComputed<T>, ContextState<T>, DependencyChanges<T>> = createScopedCollector({
    createStoreForUnit: (computed) => {
      // Start with all existing dependencies as "remaining"
      const remainingOldDependencies = new Set<ContextState<T>>(computed.dependencies);

      return {
        remainingOldDependencies,
        added: [] as ContextState<T>[],
      };
    },
    processItem: (computed, store, dependency) => {
      // Don't directly modify state dependencies to allow rollback on error

      // Check if this is a new dependency
      if (!store.remainingOldDependencies.has(dependency)) {
        const mainDependencies: Set<ContextState<T>> = computed.dependencies;
        if (!mainDependencies.has(dependency)) {
          store.added.push(dependency);
        }
      } else {
        // This dependency still exists, remove it from remaining
        store.remainingOldDependencies.delete(dependency);
      }
    },
  });

  const getChanges = (computed: ContextComputed<T>): DependencyChangeSet<T> => {
    const store = collector.getStore(computed);
    return toChangeSet(computed, store);
  };

  return {
    setScope: collector.setScope,
    exitScope: collector.exitScope,
    track: collector.collect,
    getChanges,
  };
}

function toChangeSet<T extends OriginalState | CopyState>(
  computed: ContextComputed<T>,
  changes: DependencyChanges<T>
): DependencyChangeSet<T> {
  return {
    computed,
    added: changes.added,
    deleted: changes.remainingOldDependencies.values().toArray(),
  };
}

const dependencyTracker = createDependencyTracker<OriginalState>();
export function globalDependencyTracker() {
  return dependencyTracker;
}

const copyDependencyTracker = createDependencyTracker<CopyState>();
export function globalCopyDependencyTracker() {
  return copyDependencyTracker;
}
