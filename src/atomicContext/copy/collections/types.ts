import type { CollectionChange } from '../../../collections';
import type { ComputedCopy } from '../computed';
import type { StateCopyBase } from '../types';

export type ReactiveCollectionCopy<T = any> = StateCopyBase & {
  kind: 'collection';
  type: string;
  original: any;
  dependents: Set<ComputedCopy>;
  changeSets: CollectionChange<T>[];
};
