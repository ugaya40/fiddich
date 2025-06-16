import { AtomicContext, ComputedCopy } from './types';
import { createRecomputeDependent } from '../atomicOperations/recompute';

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
      
      if (original.changeCallback) {
        original.changeCallback(copy.value, copy.value);
      }
    }
  }
}

function handleValueDirty(context: AtomicContext) {
  const recomputeDependent = createRecomputeDependent(context);
  
  for(const copy of context.valueDirty) {
    if(copy.kind === 'computed') {
      recomputeDependent(copy);
    }
  }
}

function handleConcurrentModification(context: AtomicContext) {
  for(const copy of context.valueChangedDirty) {
    const original = copy.original;
    if (copy.kind === 'cell' && original.kind === 'cell' && original.valueVersion !== copy.valueVersion) {
      throw new Error(`Concurrent value modification detected for ${original.id}`);
    }
  }
}

function handleValueChanges(context: AtomicContext) {
  for(const copy of context.valueChangedDirty) {
    const original = copy.original;
    const prevValue = original.stableValue;
    original.stableValue = copy.value;
    
    if (original.kind === 'cell') {
      original.valueVersion++;
    }
    
    if(original.kind === 'computed' && original.changeCallback) {
      original.changeCallback(prevValue, original.stableValue);
    }
  }
}

function handleDependencyChanges(context: AtomicContext) {
  for(const copy of context.dependencyDirty) {
    if(copy.kind === 'computed') {
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

export function createCommit(context: AtomicContext): () => void {
  return () => {
    handleNewlyInitialized(context.newlyInitialized);
    
    handleValueDirty(context);
    
    handleConcurrentModification(context);
    
    handleValueChanges(context);
    
    handleDependencyChanges(context);
    
    handleDisposables(context);
  };
}