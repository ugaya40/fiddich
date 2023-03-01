import { createContext } from 'react';
import { Atom, AtomFamily, AtomInstance } from './atom';
import { Selector, SelectorFamily, SelectorInstance } from './selector';

export type FiddichState<T> = Atom<T> | AtomFamily<T> | Selector<T> | SelectorFamily<T>;

export type PendingEvent<T = any> = {
  type: 'pending';
  promise: Promise<T>;
};

export type PendingForSourceEvent = {
  type: 'pending for source';
  promise: Promise<unknown>;
};

export type ChangedEvent<T = any> = {
  type: 'change';
  oldValue: T | undefined;
  newValue: T;
};

export type ChangedByPromiseEvent<T = any> = {
  type: 'change by promise';
  promise: Promise<T>;
  oldValue: T | undefined;
  newValue: T;
};

export type ErrorEvent = {
  type: 'error';
  error: unknown;
};

export type Compare<T> = (oldValue: T | undefined, newValue: T) => boolean;

export type UninitializedStatus<T> = {
  type: 'uninitialized';
  promise: Promise<T> | undefined;
  abortRequest: boolean;
};

export type PendingStatus<T> = {
  type: 'pending';
  promise: Promise<T>;
  oldValue: T | undefined;
  abortRequest: boolean;
};

export type PendingForSourceStatus<T> = {
  type: 'pending for source';
  promise: Promise<unknown>;
  oldValue: T | undefined;
};

export type StableStatus<T> = {
  type: 'stable';
  value: T;
};

export type ErrorStatus = {
  type: 'error';
  error: unknown;
};

export type FiddichStateInstance<T = any> = AtomInstance<T> | SelectorInstance<T>;

export type FiddichStore = {
  id: string;
  name?: string;
  map: Map<string, FiddichStateInstance>;
};

export type SubFiddichStore = FiddichStore & {
  parent: Store;
};

export type Store = FiddichStore | SubFiddichStore;

export type NormalStorePlaceType = {
  type: 'normal';
  nearestStore: Store;
};

export type HierarchicalStorePlaceType = {
  type: 'hierarchical';
  nearestStore: Store;
};

export type RootStorePlaceType = {
  type: 'root';
  nearestStore: Store;
};

export type NamedStorePlaceType = {
  type: 'named';
  name: string;
};

export type StorePlaceType = NormalStorePlaceType | RootStorePlaceType | HierarchicalStorePlaceType | NamedStorePlaceType;

export const FiddichStoreContext = createContext<Store | null>(null);

export const globalStoreMap = new Map<string, Store>();
