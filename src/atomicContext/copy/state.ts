import { CellCopy } from "./cell";
import { ComputedCopy } from "./computed";

export type StateCopyBase<T = any> = {
  id: string;
  value: T;
  isDisposed: boolean;
};

export type StateCopy<T = any> = CellCopy<T> | ComputedCopy<T>;