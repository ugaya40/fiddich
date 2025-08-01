import { IndexOutOfRangeError } from '../../errors';
import type { Computed } from '../../computed';
import { createEventEmitter } from '../../util/eventEmitter';
import { generateStateId } from '../../util/util';
import type { CollectionChanged, ReactiveCollection } from '../types';

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
  const currentLength = rArray.internalArray.length;
  if (index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  return rArray.internalArray[index];
}

function set<T>(rArray: ReactiveArray<T>, index: number, item: T): void {
  const currentLength = rArray.internalArray.length;
  if (index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  const oldItem = rArray.internalArray[index];
  rArray.internalArray[index] = item;
  rArray.event.emit('onCollectionChanged', [{ type: 'replace', newItem: item, oldItem, index }]);
}

function add<T>(rArray: ReactiveArray<T>, item: T): void {
  const index = rArray.internalArray.length;
  rArray.internalArray.push(item);
  rArray.event.emit('onCollectionChanged', [{ type: 'add', newItems: [item], newStartingIndex: index }]);
}

function addRange<T>(rArray: ReactiveArray<T>, items: T[]): void {
  const index = rArray.internalArray.length;
  rArray.internalArray.push(...items);
  rArray.event.emit('onCollectionChanged', [{ type: 'add', newItems: items, newStartingIndex: index }]);
}

function insert<T>(rArray: ReactiveArray<T>, index: number, item: T): void {
  rArray.internalArray.splice(index, 0, item);
  rArray.event.emit('onCollectionChanged', [{ type: 'add', newItems: [item], newStartingIndex: index }]);
}

function insertRange<T>(rArray: ReactiveArray<T>, index: number, items: T[]): void {
  rArray.internalArray.splice(index, 0, ...items);
  rArray.event.emit('onCollectionChanged', [{ type: 'add', newItems: items, newStartingIndex: index }]);
}

function remove<T>(rArray: ReactiveArray<T>, item: T): boolean {
  const index = rArray.internalArray.indexOf(item);
  if (index !== -1) {
    const oldItem = rArray.internalArray[index];
    rArray.internalArray.splice(index, 1);
    rArray.event.emit('onCollectionChanged', [{ type: 'remove', oldImtes: [oldItem], oldStartingIndex: index }]);
    return true;
  }
  return false;
}

function removeAt<T>(rArray: ReactiveArray<T>, index: number): void {
  const oldItem = rArray.internalArray[index];
  rArray.internalArray.splice(index, 1);
  rArray.event.emit('onCollectionChanged', [{ type: 'remove', oldImtes: [oldItem], oldStartingIndex: index }]);
}

function removeRange<T>(rArray: ReactiveArray<T>, index: number, count: number): void {
  const oldItems = rArray.internalArray.slice(index, index + count);
  rArray.internalArray.splice(index, count);
  rArray.event.emit('onCollectionChanged', [{ type: 'remove', oldImtes: oldItems, oldStartingIndex: index }]);
}

function removeAll<T>(rArray: ReactiveArray<T>, predicate: (item: T) => boolean): number {
  const toRemove: { index: number; item: T }[] = [];
  for (let i = 0; i < rArray.internalArray.length; i++) {
    if (predicate(rArray.internalArray[i])) {
      toRemove.push({ index: i, item: rArray.internalArray[i] });
    }
  }

  // Remove from end to start to maintain correct indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const { index, item } = toRemove[i];
    rArray.internalArray.splice(index, 1);
    rArray.event.emit('onCollectionChanged', [{ type: 'remove', oldImtes: [item], oldStartingIndex: index }]);
  }

  if (toRemove.length !== 0) {
    const args = toRemove
      .values()
      .map((removedItem) => ({
        type: 'remove' as const,
        oldImtes: [removedItem.item],
        oldStartingIndex: removedItem.index,
      }))
      .toArray();

    rArray.event.emit('onCollectionChanged', args);
  }

  return toRemove.length;
}

function clear<T>(rArray: ReactiveArray<T>): void {
  rArray.internalArray.length = 0;
  rArray.event.emit('onCollectionChanged', [{ type: 'reset' }]);
}

function createReactiveArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const internalArray = Array.from(source ?? []);
  const event = createEventEmitter<CollectionChanged<T>>();
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
    event: createEventEmitter(),
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
  };
  return array;
}

export function rArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const current = createReactiveArray(source);
  return current;
}
