import { ReactiveCollection } from "..";
import { AtomicContext } from "../../atomicContext";

export type RArray<T> = ReactiveCollection<T> & {
  internalArray: T[]
};

function length<T>(rArray: RArray<T>): number {
  return rArray.internalArray.length;
}

function get<T>(rArray: RArray<T>, index: number): T | undefined  {
  return rArray.internalArray[index];
}

function set<T>(rArray: RArray<T>, context: AtomicContext, index: number, item: T): void  {
  rArray.internalArray[index] = item;
}

function add<T>(rArray: RArray<T>, context: AtomicContext, item: T): void  {
  rArray.internalArray.push(item);
}

function addRange<T>(rArray: RArray<T>, context: AtomicContext, items: T[]): void  {
  rArray.internalArray.push(...items);
}

function insert<T>(rArray: RArray<T>, context: AtomicContext, index: number, item: T): void  {
  rArray.internalArray.splice(index, 0, item);
}

function insertRange<T>(rArray: RArray<T>, context: AtomicContext, index: number, items: T[]): void  {
  rArray.internalArray.splice(index, 0, ...items);
}

function remove<T>(rArray: RArray<T>, context: AtomicContext, item: T): boolean  {
  const index = rArray.internalArray.indexOf(item);
  if (index !== -1) {
    rArray.internalArray.splice(index, 1);
    return true;
  }
  return false;
}

function removeAt<T>(rArray: RArray<T>, context: AtomicContext, index: number): void  {
  rArray.internalArray.splice(index, 1);
}

function removeRange<T>(rArray: RArray<T>, context: AtomicContext, index: number, count: number): void  {
  rArray.internalArray.splice(index, count);
}

function removeAll<T>(rArray: RArray<T>, context: AtomicContext, predicate: (item: T) => boolean): number  {
  const toRemove: number[] = [];
  for (let i = 0; i < rArray.internalArray.length; i++) {
    if (predicate(rArray.internalArray[i])) {
      toRemove.push(i);
    }
  }
  
  // Remove from end to start to maintain correct indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    rArray.internalArray.splice(toRemove[i], 1);
  }
  
  return toRemove.length;
}

function clear<T>(rArray: RArray<T>, context: AtomicContext): void  {
  rArray.internalArray.length = 0;
}

export function rArray<T>(source?: Iterable<T>): RArray<T> {
  const internalArray = Array.from(source ?? []);
  return {
    isDirty: false,
    internalArray
  }
}