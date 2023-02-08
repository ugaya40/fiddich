import { createContext } from 'react';
import { Atom, AtomEffect, AtomFamily, AtomInstance } from './atom';
import { Selector, SelectorInstance } from './selector';

export type FiddichState<T> = Atom<T> | AtomFamily<T> | Selector<T>;

export type StateChangedEvent<T = any> = {
  type: 'change';
  oldValue: T;
  newValue: T;
};

export type StateInstanceEvent<T = any> = StateChangedEvent<T>;

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
