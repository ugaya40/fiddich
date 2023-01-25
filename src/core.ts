import { createContext } from 'react';
import { TypedEvent } from './util/TypedEvent';

export type AtomStateChangedEvent<T = any> = {
  type: 'change';
  oldValue: T;
  newValue: T;
};

export type Atom<T = any> = {
  key: string;
  defaultValue: T;
};

export type AtomState<T = any> = {
  atom: Atom<T>;
  storeId: string;
  value: T;
  event: TypedEvent<AtomStateChangedEvent<T>>;
};

export type FiddichStore = {
  id: string;
  map: Map<string, AtomState>;
};

export type SubFiddichStore = FiddichStore & {
  parent: Store;
};

export type Store = FiddichStore | SubFiddichStore;

export type SetterOrUpdater<T> = (setterOrUpdater: ((old: T) => T) | T) => void;

export const FiddichStoreContext = createContext<Store | null>(null);
