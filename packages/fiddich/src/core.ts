import { createContext } from 'react';
import { Atom, AtomEffect, AtomFamily, AtomInstance } from './atom';
import { Selector, SelectorFamily, SelectorInstance } from './selector';

export type FiddichState<T> = Atom<T> | AtomFamily<T> | Selector<T> | SelectorFamily<T>;

export type StatePendingEvent<T = any> = {
  type: 'pending';
  promise: Promise<T>;
};

export type StateChangedEvent<T = any> = {
  type: 'change';
  oldValue: T | undefined;
  newValue: T;
};

export type Compare<T> = (oldValue: T | undefined, newValue: T | undefined) => boolean;

export type StateInstanceEvent<T = any> = StatePendingEvent<T> | StateChangedEvent<T>;

export type PendingStatus<T> = {
  type: 'pending';
  promise?: Promise<T>;
  oldValue: T | undefined;
  abortRequest: boolean;
};

export type StableStatus<T> = {
  type: 'stable';
  value: T;
};

export type StateInstanceStatus<T> = PendingStatus<T> | StableStatus<T>;

export type FiddichStateInstance<T = any> = AtomInstance<T> | SelectorInstance<T>;

export type FiddichStore = {
  id: string;
  map: Map<string, FiddichStateInstance>;
};

export type SubFiddichStore = FiddichStore & {
  parent: Store;
};

export type Store = FiddichStore | SubFiddichStore;

export const FiddichStoreContext = createContext<Store | null>(null);

export const globalAtomEffectMap = new Map<string, AtomEffect<any>>();
