import type { CollectionChanged } from '../../../collections';
import type { EventEmitter } from '../../../util/eventEmitter';
import type { ComputedCopy } from '../computed';
import type { StateCopyBase } from '../types';

export type ReactiveCollectionCopy<T = any> = StateCopyBase & {
  kind: 'collection';
  type: string;
  dependents: Set<ComputedCopy>;
  event: EventEmitter<CollectionChanged<T>>;
};
