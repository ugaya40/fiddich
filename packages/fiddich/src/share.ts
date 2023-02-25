import { createContext } from 'react';
import { Atom, AtomEffect, AtomFamily, AtomInstance } from './atom';
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

export type Compare<T> = (oldValue: T | undefined, newValue: T | undefined) => boolean;

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

export type NearestStorePlaceType = {
  type: 'nearest';
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

export type StorePlaceType = NormalStorePlaceType | RootStorePlaceType | NearestStorePlaceType | NamedStorePlaceType;

export const FiddichStoreContext = createContext<Store | null>(null);

export const globalAtomEffectMap = new Map<string, AtomEffect<any>>();

export const globalStoreMap = new Map<string, Store>();

export const getOldValue = <T>(instance: FiddichStateInstance<T>) => {
  return instance.status.type === 'stable' ? instance.status.value : instance.status.type === 'uninitialized' ? undefined : instance.status.oldValue;
};
