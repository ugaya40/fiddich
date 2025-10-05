import type { Computed } from '../computed';
import type { ReactiveState } from '../types';
import type { EventEmitter } from '../util/eventEmitter';
import type { ReactiveArray } from './array/rArray';

export type Add<T> = { type: 'add'; newItems: T[]; newStartingIndex: number };
export type Remove<T> = { type: 'remove'; oldItems: T[]; oldStartingIndex: number };
export type Replace<T> = { type: 'replace'; newItem: T; oldItem: T; index: number };
export type Reset = { type: 'reset' };

export type CollectionChange<T> = Add<T> | Remove<T> | Replace<T> | Reset;

export type CollectionEvents<T> = {
  onCollectionChanged: CollectionChange<T>[];
};

export interface ReactiveCollection<T = any> extends ReactiveState {
  kind: 'collection';
  type: string;
  dependents: Set<Computed>;
  collectionEvent: EventEmitter<CollectionEvents<T>>;
}

export type ReactiveCollections = ReactiveArray;
