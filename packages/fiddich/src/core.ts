import { createContext } from 'react';
import { TypedEvent } from './util/TypedEvent';

export type AtomStateChangedEvent<T = any> = {
  type: 'change';
  oldValue: T;
  newValue: T;
};

export type Atom<T = any> = {
  type: 'atom';
  key: string;
  default: T;
};

export type AtomFamily<T = any> = {
  type: 'atomFamily';
  key: string;
  baseKey: string;
  default: T;
};

export type Atoms<T> = Atom<T> | AtomFamily<T>;

export type AtomFamilyFunction<T = any, Parameter = any> = (arg: Parameter) => AtomFamily<T>;

type ChangeEffectArg<T> = {
  newValue: T;
  oldValue: T;
  atomState: AtomState<T>;
};

export type AtomsEffect<T> = {
  onBeforeChange?: (arg: ChangeEffectArg<T>) => boolean;
  onAfterChange?: (arg: ChangeEffectArg<T>) => void;
};

export type AtomState<T = any> = {
  atom: Atoms<T>;
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

export const globalEffectMap = new Map<string, AtomsEffect<any>>();
