import { scheduleNotifications } from '../stateUtil/scheduleNotifications';
import { isState } from '../stateUtil/typeUtil';
import type { AtomicContext } from './types';

function applyDirtyFlags(context: AtomicContext) {
  for(const computedCopy of context.valueDirty) {
    computedCopy.original.isDirty = true;
  }
}

function applyDependencyChanges(context: AtomicContext) {
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
}


function applyValueChanges(context: AtomicContext) {
  for (const copy of context.valueChanged) {
    copy.original.stableValue = copy.value;
  }
}

function executeDisposals(context: AtomicContext) {
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

function sendNotifications(context: AtomicContext) {
  // Note: We should only notify states that are not included in valueDirty/valueChanged/toDispose,
  // but checking each Set's values up to their originals for accurate filtering would be costly.
  // Instead, we delegate deduplication to the Set inside scheduleNotifications.
  scheduleNotifications(context.toNotify.values().map(c => c.original).toArray());
}


export function commit(context: AtomicContext): void {
  applyDirtyFlags(context);
  applyDependencyChanges(context);
  applyValueChanges(context);
  executeDisposals(context);
  sendNotifications(context);
}
