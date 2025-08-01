import type { ReactiveArray } from '../../../collections/array/rArray';
import type { ReactiveCollectionCopy } from './types';

export type ReactiveArrayCopy<T> = ReactiveCollectionCopy<T> & Pick<
  ReactiveArray<T>,
  | 'length'
  | 'indexOf'
  | 'lastIndexOf'
  | 'includes'
  | 'find'
  | 'findIndex'
  | 'get'
  | 'set'
  | 'add'
  | 'addRange'
  | 'insert'
  | 'insertRange'
  | 'remove'
  | 'removeAt'
  | 'removeRange'
  | 'removeAll'
  | 'clear'
>;
