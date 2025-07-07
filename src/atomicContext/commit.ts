import { isState } from '../stateUtil/typeUtil';
import type { AtomicContext } from './types';
import type { State } from '../state';

export function commit(context: AtomicContext): void {
  const scheduledForNotification = new Set<State>();

  // Apply dirty flags and schedule notifications
  for(const computedCopy of context.valueDirty) {
    computedCopy.original.isDirty = true;
    scheduledForNotification.add(computedCopy.original);
  }

  // Apply dependency changes
  for (const dependencyChanges of context.dependencyDirty) {
    const {added, deleted, computed} = dependencyChanges;
    const original = computed.original;

    for(const oldOriginal of deleted.map(c => c.original)) {
      oldOriginal.dependents.delete(original);
      original.dependencies.delete(oldOriginal);
    }

    for(const newOriginal of added.map(c => c.original)) {
      newOriginal.dependents.add(original);
      original.dependencies.add(newOriginal);
    }
  }

  // Apply value changes and schedule notifications
  for (const copy of context.valueChanged) {
    copy.original.stableValue = copy.value;
    scheduledForNotification.add(copy.original);
  }

  // Execute disposals and schedule notifications
  for (const disposable of context.toDispose) {
    if(isState(disposable)) {
      if(!disposable.isDisposed) {
        disposable[Symbol.dispose]();
        scheduledForNotification.add(disposable);
      }
    } else {
      disposable[Symbol.dispose]();
    }
  }

  // Send notifications for items not already scheduled
  for (const copy of context.toNotify) {
    if (!scheduledForNotification.has(copy.original)) {
      copy.original.onNotify?.();
    }
  }
}
