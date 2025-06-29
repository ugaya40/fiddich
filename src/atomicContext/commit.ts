import { recompute } from '../atomicOperations/recompute';
import { scheduleNotifications } from '../stateUtil/scheduleNotifications';
import { isComputedCopy, isState } from '../stateUtil/typeUtil';
import type { AtomicContext, StateCopy } from './types';

function handleNewlyInitialized(context: AtomicContext) {
  for (const copy of context.newlyInitialized) {

    const original = copy.original;
    if (!original.isInitialized) {
      original.stableValue = copy.value;
      original.isInitialized = true;

      for (const depCopy of copy.dependencies) {
        original.dependencies.add(depCopy.original);
        depCopy.original.dependents.add(original);
      }
    }
  }
}

function handleValueDirty(context: AtomicContext) {
  while (context.valueDirty.size > 0) {
    // Sort by rank
    const sorted = [...context.valueDirty].sort((a, b) => a.rank - b.rank);

    // Process the first node (lowest rank)
    const copy = sorted[0];

    if (isComputedCopy(copy)) {
      recompute(copy, context);
    }
    context.valueDirty.delete(copy);
  }
}

function handleValueChanges(context: AtomicContext) {
  for (const copy of context.valueChangedDirty) {

    const original = copy.original;
    const prevValue = original.stableValue;
    original.stableValue = copy.value;

    if (original.changeCallback) {
      original.changeCallback(prevValue, original.stableValue);
    }
  }
}

function handleDependencyChanges(context: AtomicContext) {
  for (const dependencyChanges of context.dependencyDirty) {
    
    const {changes, computedCopy} = dependencyChanges;
    const original = computedCopy.original;

    for(const oldDependency of changes.deleted.map(c => c.original)) {
      oldDependency.dependents.delete(computedCopy.original);
      original.dependencies.delete(oldDependency);
    }

    for(const newDependency of changes.added.map(c => c.original)) {
      newDependency.dependents.add(original);
      original.dependencies.add(newDependency);
    }
  }
}

function handleDisposables(context: AtomicContext) {
  for (const disposable of context.toDispose) {
    if(isState(disposable)) {
      if(!disposable.isDisposed) {
        disposable[Symbol.dispose]();
      }
    } else {
      disposable[Symbol.dispose]();
    }
  }
}

function handleNotifications(context: AtomicContext) {
  const scheduledNotifications: Array<() => void> = [];

  // Merge valueChangedDirty and notificationDirty
  const allNotifications = new Set<StateCopy>([...context.valueChangedDirty, ...context.notificationDirty]);

  for (const copy of allNotifications) {

    const original = copy.original;
    if (original.onScheduledNotify) {
      scheduledNotifications.push(original.onScheduledNotify);
    }
  }

  if (scheduledNotifications.length > 0) {
    scheduleNotifications(scheduledNotifications);
  }
}

export function commit(context: AtomicContext): void {

  handleValueDirty(context);

  handleValueChanges(context);

  handleDependencyChanges(context);

  // Must be called after handleValueDirty to ensure that any computeds
  // newly initialized during recomputation have their dependencies
  // reflected in the original state before the next atomicUpdate
  handleNewlyInitialized(context);

  handleNotifications(context);

  handleDisposables(context);
}
