import { AtomicContext, ComputedCopy, StateCopy } from './types';
import { recompute } from '../atomicOperations/recompute';
import { scheduleNotifications } from '../stateUtil';
import { globalCircularDetector } from '../stateUtil/circularDetector';
import { isCell, isCellCopy, isComputedCopy } from '../stateUtil/typeUtil';

function handleNewlyInitialized(newlyInitialized: Set<ComputedCopy<any>>) {
  for (const copy of newlyInitialized) {
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
      const detector = globalCircularDetector();
      const scope = {};
      detector.setScope(scope);
      try {
        recompute(copy,context);
      } finally {
        detector.exitScope(scope);
      }
    }
    context.valueDirty.delete(copy);
  }
}

function handleConcurrentModification(context: AtomicContext) {
  for(const copy of context.valueChangedDirty) {
    const original = copy.original;
    if (isCellCopy(copy) && isCell(original) && original.valueVersion !== copy.valueVersion) {
      throw new Error(`Concurrent value modification detected for ${original.id}`);
    }
  }
}

function handleValueChanges(context: AtomicContext) {
  for(const copy of context.valueChangedDirty) {
    const original = copy.original;
    const prevValue = original.stableValue;
    original.stableValue = copy.value;
    
    if (isCell(original)) {
      original.valueVersion++;
    }
    
    if(original.changeCallback) {
      original.changeCallback(prevValue, original.stableValue);
    }
  }
}

function handleDependencyChanges(context: AtomicContext) {
  for(const copy of context.dependencyDirty) {
    if(isComputedCopy(copy)) {
      const original = copy.original;
      
      if (original.dependencyVersion !== copy.dependencyVersion) {
        throw new Error(`Concurrent dependency modification detected for ${original.id}`);
      }
      
      for(const oldDependency of original.dependencies) {
        oldDependency.dependents.delete(original);
      }

      original.dependencies = new Set([...copy.dependencies].map(one => one.original));

      for(const newDependency of original.dependencies) {
        newDependency.dependents.add(original);
      }

      original.dependencyVersion++;
    }
  }
}

function handleDisposables(context: AtomicContext) {
  for (const disposable of context.toDispose) {
    disposable[Symbol.dispose]();
  }
}

function handleNotifications(context: AtomicContext) {
  const scheduledNotifications: Array<() => void> = [];
  
  // Merge valueChangedDirty and notificationDirty
  const allNotifications = new Set<StateCopy<any>>([
    ...context.valueChangedDirty,
    ...context.notificationDirty
  ]);
  
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
  handleNewlyInitialized(context.newlyInitialized);
    
  handleValueDirty(context);
  
  handleConcurrentModification(context);
  
  handleValueChanges(context);
  
  handleDependencyChanges(context);
  
  handleNotifications(context);
  
  handleDisposables(context);
}