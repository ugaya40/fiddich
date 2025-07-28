import { ComputedCopy } from "../atomicContext";
import { Computed, ReactiveState } from "../state";
import { EventEmitter } from "../util/eventEmitter";
import { ReactiveArray } from "./array/rArray";

export type Add<T> = {type: 'add', newItems: T[], newStartingIndex: number}
export type Remove<T> = {type: 'remove', oldImtes: T[], oldStartingIndex: number}
export type Replace<T> = {type: 'replace', newItem: T, oldItem: T, index: number}
export type Reset = {type: 'reset'}

export type CollectionChanged<T> = {
  onCollectionChanged: (Add<T> | Remove<T> | Replace<T> | Reset)[],
  onPendingChange: void,
}


export interface ReactiveCollection<T = any> extends ReactiveState {
  kind: 'collection',
  type: string,
  dependents: Set<Computed>,
  isDisposed: boolean;
  pendingPromise?: Promise<any>;
  event: EventEmitter<CollectionChanged<T>>,
}

export interface ReactiveCollectionCopy<T = any> {
  kind: 'collection',
  type: string,
  dependents: Set<ComputedCopy>,
  isDisposed: boolean;
  event: EventEmitter<CollectionChanged<T>>,
}

export type ReactiveCollections = ReactiveArray