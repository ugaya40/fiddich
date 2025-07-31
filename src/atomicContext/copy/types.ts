import type { CellCopy } from './cell';
import type { ComputedCopy } from './computed';

export type StateCopyBase = {
  id: string;
  isDisposed: boolean;
};

export type ValueStateCopyBase<T = any> = StateCopyBase & {
  value: T;
};

export type ValueStateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;
