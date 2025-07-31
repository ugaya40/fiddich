import type { Computed } from '../../types';
import type { AtomicContext } from '../index';
import type { ValueStateCopy } from './';
import type { ValueStateCopyBase } from './types';

export interface ComputedCopy<T = any> extends ValueStateCopyBase<T> {
  kind: 'computed';
  dependents: Set<ComputedCopy>;
  dependencies: Set<ValueStateCopy>;
  original: Computed<T>;
  isDirty: boolean;
}

export function createComputedCopy<T>(computed: Computed<T>, context: AtomicContext): ComputedCopy<T> {
  const copy: ComputedCopy<T> = {
    id: computed.id,
    kind: 'computed',
    original: computed,
    value: computed.stableValue,
    dependents: new Set(),
    dependencies: new Set(),
    isDirty: computed.isDirty,
    isDisposed: computed.isDisposed,
  };

  // Register copy immediately to handle circular dependencies
  context.copyStore.registerCopy(computed, copy);

  for (const dependent of computed.dependents) {
    copy.dependents.add(context.copyStore.getCopy(dependent));
  }

  for (const dependency of computed.dependencies) {
    copy.dependencies.add(context.copyStore.getCopy(dependency));
  }

  return copy;
}
