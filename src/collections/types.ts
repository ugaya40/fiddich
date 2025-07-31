import type { Computed, ReactiveState } from '../types';
import type { EventEmitter } from '../util/eventEmitter';
import type { ReactiveArray } from './array/rArray';

export type Add<T> = { type: 'add'; newItems: T[]; newStartingIndex: number };
export type Remove<T> = { type: 'remove'; oldImtes: T[]; oldStartingIndex: number };
export type Replace<T> = { type: 'replace'; newItem: T; oldItem: T; index: number };
export type Reset = { type: 'reset' };

export type CollectionChanged<T> = {
  onCollectionChanged: (Add<T> | Remove<T> | Replace<T> | Reset)[];
  onPendingChange: void;
};

export interface ReactiveCollection<T = any> extends ReactiveState {
  kind: 'collection';
  type: string;
  dependents: Set<Computed>;
  isDisposed: boolean;
  pendingPromise?: Promise<any>;
  event: EventEmitter<CollectionChanged<T>>;
}

export type ReactiveCollections = ReactiveArray;
