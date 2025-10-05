import type { AtomicContext } from '../..';
import { disposeForAtomicOperation } from '../../../atomicOperations/dispose';
import { markDirtyRecursiveForCopy } from '../../../atomicOperations/markDirtyRecursiveForCopy';
import type { ReactiveCollections } from '../../../collections';
import type { ReactiveArray } from '../../../collections/array/rArray';
import {
  addImpl,
  addRangeImpl,
  clearImpl,
  getImpl,
  insertImpl,
  insertRangeImpl,
  removeAllImpl,
  removeAtImpl,
  removeImpl,
  removeRangeImpl,
  setImpl,
} from '../../../collections/array/arrayImpl';
import type { CollectionChange } from '../../../collections/types';
import { generateStateId } from '../../../util/util';
import type { ComputedCopy } from '../computed';
import type { ReactiveCollectionCopy } from './types';

function recordChange<T>(copy: ReactiveArrayCopy<T>, context: AtomicContext, ...changes: CollectionChange<T>[]) {
  copy.changeSets.push(...changes);
  for (const dependent of copy.dependents) {
    markDirtyRecursiveForCopy(dependent, context);
  }
}

export type ReactiveArrayCopy<T> = ReactiveCollectionCopy<T> &
  Pick<
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
  > & {
    internalArray: T[];
    original: ReactiveArray<T>;
    [Symbol.dispose](): void;
  };

export function createReactiveArrayCopy<T>(original: ReactiveArray<T>, context: AtomicContext): ReactiveArrayCopy<T> {
  const internalArray = [...original.internalArray];
  const changeSets: CollectionChange<T>[] = [];

  const copy: ReactiveArrayCopy<T> = {
    id: generateStateId(),
    kind: 'collection',
    type: 'array',
    original,
    dependents: new Set<ComputedCopy>(),
    changeSets,
    internalArray,
    isDisposed: false,

    length: () => internalArray.length,
    indexOf: (item, fromIndex) => internalArray.indexOf(item, fromIndex),
    lastIndexOf: (item, fromIndex) => internalArray.lastIndexOf(item, fromIndex),
    includes: (item, fromIndex) => internalArray.includes(item, fromIndex),
    find: (predicate) => internalArray.find(predicate),
    findIndex: (predicate) => internalArray.findIndex(predicate),

    get: (index) => getImpl(internalArray, index),

    set: (index, item) =>
      setImpl(internalArray, index, item, (change) => {
        recordChange(copy, context, change);
      }),

    add: (item) =>
      addImpl(internalArray, item, (change) => {
        recordChange(copy, context, change);
      }),

    addRange: (items) =>
      addRangeImpl(internalArray, items, (change) => {
        recordChange(copy, context, change);
      }),

    insert: (index, item) =>
      insertImpl(internalArray, index, item, (change) => {
        recordChange(copy, context, change);
      }),

    insertRange: (index, items) =>
      insertRangeImpl(internalArray, index, items, (change) => {
        recordChange(copy, context, change);
      }),

    remove: (item) =>
      removeImpl(internalArray, item, (change) => {
        recordChange(copy, context, change);
      }),

    removeAt: (index) =>
      removeAtImpl(internalArray, index, (change) => {
        recordChange(copy, context, change);
      }),

    removeRange: (index, count) =>
      removeRangeImpl(internalArray, index, count, (change) => {
        recordChange(copy, context, change);
      }),

    removeAll: (predicate) =>
      removeAllImpl(internalArray, predicate, (changes) => {
        recordChange(copy, context, ...changes);
      }),

    clear: () =>
      clearImpl(internalArray, (change) => {
        recordChange(copy, context, change);
      }),

    [Symbol.dispose](): void {
      disposeForAtomicOperation(original, context);
    },
  };

  return copy;
}

export function isReactiveArray(collection: ReactiveCollections): collection is ReactiveArray {
  return collection.type === 'array';
}
