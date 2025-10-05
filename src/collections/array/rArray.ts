import type { Computed } from '../../computed';
import { markDirtyRecursive } from '../../markDirtyRecursive';
import type { StateEvent } from '../../types';
import { createEventEmitter } from '../../util/eventEmitter';
import { generateStateId } from '../../util/util';
import type { CollectionChange, CollectionEvents, ReactiveCollection } from '../types';
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
} from './arrayImpl';

export type ReactiveArray<T = any> = ReactiveCollection<T> & {
  internalArray: T[];
  length(): number;
  indexOf(item: T, fromIndex?: number): number;
  lastIndexOf(item: T, fromIndex?: number): number;
  includes(item: T, fromIndex?: number): boolean;
  find(predicate: (value: T, index: number, array: T[]) => boolean): T | undefined;
  findIndex(predicate: (value: T, index: number, array: T[]) => boolean): number;
  get(index: number): T;
  set(index: number, item: T): void;
  add(item: T): void;
  addRange(items: T[]): void;
  insert(index: number, item: T): void;
  insertRange(index: number, items: T[]): void;
  remove(item: T): boolean;
  removeAt(index: number): void;
  removeRange(index: number, count: number): void;
  removeAll(predicate: (item: T) => boolean): number;
  clear(): void;
};

function notifyChange<T>(rArray: ReactiveArray<T>, ...changes: CollectionChange<T>[]) {
   for (const computed of rArray.dependents) {
    markDirtyRecursive(computed);
  }
  rArray.collectionEvent.emit('onCollectionChanged', changes);
  rArray.event.emit('onNotify', undefined);
}

function length<T>(rArray: ReactiveArray<T>): number {
  return rArray.internalArray.length;
}

function indexOf<T>(rArray: ReactiveArray<T>, item: T, fromIndex?: number): number {
  return rArray.internalArray.indexOf(item, fromIndex);
}

function lastIndexOf<T>(rArray: ReactiveArray<T>, item: T, fromIndex?: number): number {
  return rArray.internalArray.lastIndexOf(item, fromIndex);
}

function includes<T>(rArray: ReactiveArray<T>, item: T, fromIndex?: number): boolean {
  return rArray.internalArray.includes(item, fromIndex);
}

function find<T>(rArray: ReactiveArray<T>, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined {
  return rArray.internalArray.find(predicate);
}

function findIndex<T>(rArray: ReactiveArray<T>, predicate: (value: T, index: number, array: T[]) => boolean): number {
  return rArray.internalArray.findIndex(predicate);
}

function get<T>(rArray: ReactiveArray<T>, index: number): T {
  return getImpl(rArray.internalArray, index);
}

function set<T>(rArray: ReactiveArray<T>, index: number, item: T): void {
  setImpl(rArray.internalArray, index, item, (change) => {
    notifyChange(rArray, change);
  });
}

function add<T>(rArray: ReactiveArray<T>, item: T): void {
  addImpl(rArray.internalArray, item, (change) => {
    notifyChange(rArray, change);
  });
}

function addRange<T>(rArray: ReactiveArray<T>, items: T[]): void {
  addRangeImpl(rArray.internalArray, items, (change) => {
    notifyChange(rArray, change);
  });
}

function insert<T>(rArray: ReactiveArray<T>, index: number, item: T): void {
  insertImpl(rArray.internalArray, index, item, (change) => {
    notifyChange(rArray, change);
  });
}

function insertRange<T>(rArray: ReactiveArray<T>, index: number, items: T[]): void {
  insertRangeImpl(rArray.internalArray, index, items, (change) => {
    notifyChange(rArray, change);
  });
}

function remove<T>(rArray: ReactiveArray<T>, item: T): boolean {
  return removeImpl(rArray.internalArray, item, (change) => {
    notifyChange(rArray, change);
  });
}

function removeAt<T>(rArray: ReactiveArray<T>, index: number): void {
  removeAtImpl(rArray.internalArray, index, (change) => {
    notifyChange(rArray, change);
  });
}

function removeRange<T>(rArray: ReactiveArray<T>, index: number, count: number): void {
  removeRangeImpl(rArray.internalArray, index, count, (change) => {
    notifyChange(rArray, change);
  });
}

function removeAll<T>(rArray: ReactiveArray<T>, predicate: (item: T) => boolean): number {
  return removeAllImpl(rArray.internalArray, predicate, (changes) => {
    notifyChange(rArray, ...changes);
  });
}

function clear<T>(rArray: ReactiveArray<T>): void {
  clearImpl(rArray.internalArray, (change) => {
    notifyChange(rArray, change);
  });
}

function createReactiveArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const internalArray = Array.from(source ?? []);
  const event = createEventEmitter<StateEvent>();
  const collectionEvent = createEventEmitter<CollectionEvents<T>>();
  let pendingPromiseInternal: Promise<any> | undefined;
  const array: ReactiveArray<T> = {
    id: generateStateId(),
    kind: 'collection',
    type: 'array',
    isDisposed: false,
    dependents: new Set<Computed>(),

    get pendingPromise() {
      return pendingPromiseInternal;
    },

    set pendingPromise(value: Promise<any> | undefined) {
      pendingPromiseInternal = value;
      if (value != null) {
        event.emit('onPendingChange', undefined);
      }
    },
    event,
    collectionEvent: collectionEvent,
    internalArray,
    toJSON() {
      return internalArray;
    },

    length: () => length(array),
    indexOf: (item, fromIndex) => indexOf(array, item, fromIndex),
    lastIndexOf: (item, fromIndex) => lastIndexOf(array, item, fromIndex),
    includes: (item, fromIndex) => includes(array, item, fromIndex),
    find: (predicate) => find(array, predicate),
    findIndex: (predicate) => findIndex(array, predicate),
    get: (index) => get(array, index),
    set: (index, item) => set(array, index, item),
    add: (item) => add(array, item),
    addRange: (items) => addRange(array, items),
    insert: (index, item) => insert(array, index, item),
    insertRange: (index, items) => insertRange(array, index, items),
    remove: (item) => remove(array, item),
    removeAt: (index) => removeAt(array, index),
    removeRange: (index, count) => removeRange(array, index, count),
    removeAll: (predicate) => removeAll(array, predicate),
    clear: () => clear(array),

    [Symbol.dispose](): void {
      if (array.isDisposed) return;

      array.isDisposed = true;

      for (const computed of array.dependents) {
        markDirtyRecursive(computed);
      }
      collectionEvent.emit('onCollectionChanged', [{ type: 'reset' }]);
      collectionEvent[Symbol.dispose]();
      event.emit('onNotify', undefined);
      event[Symbol.dispose]();
    },
  };
  return array;
}

export function rArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const current = createReactiveArray(source);
  return current;
}
