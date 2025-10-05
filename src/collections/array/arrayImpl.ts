import { IndexOutOfRangeError } from '../../errors';
import type { Add, Remove, Replace, Reset } from '../types';

export function getImpl<T>(internalArray: T[], index: number): T {
  const currentLength = internalArray.length;
  if (index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  return internalArray[index];
}

export function setImpl<T>(
  internalArray: T[],
  index: number,
  item: T,
  onChanged: (change: Replace<T>) => void
): void {
  const currentLength = internalArray.length;
  if (index < 0 || index >= currentLength) {
    throw new IndexOutOfRangeError(index, currentLength);
  }
  const oldItem = internalArray[index];
  internalArray[index] = item;
  onChanged({ type: 'replace', newItem: item, oldItem, index });
}

export function addImpl<T>(internalArray: T[], item: T, onChanged: (change: Add<T>) => void): void {
  const index = internalArray.length;
  internalArray.push(item);
  onChanged({ type: 'add', newItems: [item], newStartingIndex: index });
}

export function addRangeImpl<T>(internalArray: T[], items: T[], onChanged: (change: Add<T>) => void): void {
  const index = internalArray.length;
  internalArray.push(...items);
  onChanged({ type: 'add', newItems: items, newStartingIndex: index });
}

export function insertImpl<T>(internalArray: T[], index: number, item: T, onChanged: (change: Add<T>) => void): void {
  internalArray.splice(index, 0, item);
  onChanged({ type: 'add', newItems: [item], newStartingIndex: index });
}

export function insertRangeImpl<T>(
  internalArray: T[],
  index: number,
  items: T[],
  onChanged: (change: Add<T>) => void
): void {
  internalArray.splice(index, 0, ...items);
  onChanged({ type: 'add', newItems: items, newStartingIndex: index });
}

export function removeImpl<T>(internalArray: T[], item: T, onChanged: (change: Remove<T>) => void): boolean {
  const index = internalArray.indexOf(item);
  if (index !== -1) {
    const oldItem = internalArray[index];
    internalArray.splice(index, 1);
    onChanged({ type: 'remove', oldItems: [oldItem], oldStartingIndex: index });
    return true;
  }
  return false;
}

export function removeAtImpl<T>(internalArray: T[], index: number, onChanged: (change: Remove<T>) => void): void {
  const oldItem = internalArray[index];
  internalArray.splice(index, 1);
  onChanged({ type: 'remove', oldItems: [oldItem], oldStartingIndex: index });
}

export function removeRangeImpl<T>(
  internalArray: T[],
  index: number,
  count: number,
  onChanged: (change: Remove<T>) => void
): void {
  const oldItems = internalArray.slice(index, index + count);
  internalArray.splice(index, count);
  onChanged({ type: 'remove', oldItems: oldItems, oldStartingIndex: index });
}

export function removeAllImpl<T>(
  internalArray: T[],
  predicate: (item: T) => boolean,
  onChanged: (changes: Remove<T>[]) => void
): number {
  const toRemove: { index: number; item: T }[] = [];
  for (let i = 0; i < internalArray.length; i++) {
    if (predicate(internalArray[i])) {
      toRemove.push({ index: i, item: internalArray[i] });
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const { index } = toRemove[i];
    internalArray.splice(index, 1);
  }

  if (toRemove.length !== 0) {
    const changes = toRemove.map((removedItem) => ({
      type: 'remove' as const,
      oldItems: [removedItem.item],
      oldStartingIndex: removedItem.index,
    }));
    onChanged(changes);
  }

  return toRemove.length;
}

export function clearImpl<T>(internalArray: T[], onChanged: (change: Reset) => void): void {
  internalArray.length = 0;
  onChanged({ type: 'reset' });
}
