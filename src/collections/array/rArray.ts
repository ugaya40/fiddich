import { CollectionChanged, ReactiveCollection } from "..";
import { AtomicContext } from "../../atomicContext";
import { IndexOutOfRangeError } from "../../errors";
import { Computed } from "../../state";
import { createEventEmitter } from "../../util/eventEmitter";
import { generateStateId } from "../../util/util";

export type ReactiveArray<T = any> = ReactiveCollection<T> & {
  internalArray: T[]
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

function get<T>(rArray: ReactiveArray<T>, index: number): T  {
  const currentLength = rArray.internalArray.length;
  if(index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  return rArray.internalArray[index];
}

function set<T>(rArray: ReactiveArray<T>, index: number, item: T): void  {
  const currentLength = rArray.internalArray.length;
  if(index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  const oldItem = rArray.internalArray[index];
  rArray.internalArray[index] = item;
  rArray.event.emit('onCollectionChanged', [{type: 'replace', newItem: item, oldItem, index}]);
}

function add<T>(rArray: ReactiveArray<T>, item: T): void  {
  const index = rArray.internalArray.length;
  rArray.internalArray.push(item);
  rArray.event.emit('onCollectionChanged', [{type: 'add', newItems: [item], newStartingIndex: index}]);
}

function addRange<T>(rArray: ReactiveArray<T>, items: T[]): void  {
  const index = rArray.internalArray.length;
  rArray.internalArray.push(...items);
  rArray.event.emit('onCollectionChanged', [{type: 'add', newItems: items, newStartingIndex: index}]);
}

function insert<T>(rArray: ReactiveArray<T>, index: number, item: T): void  {
  rArray.internalArray.splice(index, 0, item);
  rArray.event.emit('onCollectionChanged', [{type: 'add', newItems: [item], newStartingIndex: index}]);
}

function insertRange<T>(rArray: ReactiveArray<T>, index: number, items: T[]): void  {
  rArray.internalArray.splice(index, 0, ...items);
  rArray.event.emit('onCollectionChanged', [{type: 'add', newItems: items, newStartingIndex: index}]);
}

function remove<T>(rArray: ReactiveArray<T>, item: T): boolean  {
  const index = rArray.internalArray.indexOf(item);
  if (index !== -1) {
    const oldItem = rArray.internalArray[index];
    rArray.internalArray.splice(index, 1);
    rArray.event.emit('onCollectionChanged', [{type: 'remove', oldImtes: [oldItem], oldStartingIndex: index}]);
    return true;
  }
  return false;
}

function removeAt<T>(rArray: ReactiveArray<T>, index: number): void  {
  const oldItem = rArray.internalArray[index];
  rArray.internalArray.splice(index, 1);
  rArray.event.emit('onCollectionChanged', [{type: 'remove', oldImtes: [oldItem], oldStartingIndex: index}]);
}

function removeRange<T>(rArray: ReactiveArray<T>, index: number, count: number): void  {
  const oldItems = rArray.internalArray.slice(index, index + count);
  rArray.internalArray.splice(index, count);
  rArray.event.emit('onCollectionChanged', [{type: 'remove', oldImtes: oldItems, oldStartingIndex: index}]);
}

function removeAll<T>(rArray: ReactiveArray<T>, predicate: (item: T) => boolean): number  {
  const toRemove: {index: number, item: T}[] = [];
  for (let i = 0; i < rArray.internalArray.length; i++) {
    if (predicate(rArray.internalArray[i])) {
      toRemove.push({index: i, item: rArray.internalArray[i]});
    }
  }
  
  // Remove from end to start to maintain correct indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const {index, item} = toRemove[i];
    rArray.internalArray.splice(index, 1);
    rArray.event.emit('onCollectionChanged', [{type: 'remove', oldImtes: [item], oldStartingIndex: index}]);
  }

  if(toRemove.length !== 0) {
    const args = toRemove.values()
      .map(removedItem => ({
        type: 'remove' as const, 
        oldImtes: [removedItem.item], 
        oldStartingIndex: removedItem.index}))
      .toArray();
    
    rArray.event.emit('onCollectionChanged', args);
  }
  
  return toRemove.length;
}

function clear<T>(rArray: ReactiveArray<T>): void  {
  rArray.internalArray.length = 0;
  rArray.event.emit('onCollectionChanged', [{type: 'reset'}]);
}

function createRArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const internalArray = Array.from(source ?? []);
  const event = createEventEmitter<CollectionChanged<T>>();
  let pendingPromiseInternal: Promise<any> | undefined;
  return {
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
    }
  };
}

export function copyRArray<T>(rArray: ReactiveArray<T>, context: AtomicContext) {
  
}

export function rArray<T>(source?: Iterable<T>): ReactiveArray<T> {
  const current = createRArray(source);
  current.event.on('onCollectionChanged', arg => {
  });
  return current;
}