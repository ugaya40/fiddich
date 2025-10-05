import type { CellCopy } from './cell';
import type { ReactiveCollectionCopy } from './collections/types';
import type { ComputedCopy } from './computed';

export type StateCopyBase = {
  id: string;
  isDisposed: boolean;
};

export type ValueStateCopyBase<T = any> = StateCopyBase & {
  value: T;
};

export type ValueStateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;

export type StateCopy = ValueStateCopy | ReactiveCollectionCopy;
