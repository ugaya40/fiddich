import {
  AsyncAtom,
  AsyncAtomFamily,
  AsyncAtomInstanceEvent,
  AsyncAtomSetterOrUpdater,
  Atom,
  AtomFamily,
  AtomInstance,
  SyncAtom,
  SyncAtomFamily,
  SyncAtomInstanceEvent,
  SyncAtomSetterOrUpdater,
} from './atom';
import { EventPublisher } from './util/event';
import {
  AsyncSelector,
  AsyncSelectorFamily,
  AsyncSelectorInstanceEvent,
  Selector,
  SelectorFamily,
  SelectorInstance,
  SyncSelector,
  SyncSelectorFamily,
  SyncSelectorInstanceEvent,
} from './selector';

export type FiddichState<T> = Atom<T> | AtomFamily<T> | Selector<T> | SelectorFamily<T>;
export type SyncFiddichState<T> = SyncAtom<T> | SyncAtomFamily<T, any> | SyncSelector<T> | SyncSelectorFamily<T, any>;
export type AsyncFiddichState<T> = AsyncAtom<T> | AsyncAtomFamily<T, any> | AsyncSelector<T> | AsyncSelectorFamily<T, any>;

export type InitializedEvent<T = any> = {
  type: 'initialized';
  value: T;
};

export type WaitingEvent = {
  type: 'waiting';
  promise: Promise<void>;
};

export type ChangedEvent<T = any> = {
  type: 'change';
  oldValue: T | undefined;
  newValue: T;
};

export type ChangedByPromiseEvent<T = any> = {
  type: 'change by promise';
  oldValue: T | undefined;
  newValue: T;
};

export type ErrorEvent = {
  type: 'error';
  error: Error;
};

export type Compare = <T>(oldValue: T | undefined, newValue: T) => boolean;

export type UnknownStatus = {
  type: 'unknown';
};

export type WaitingForInitializeStatus = {
  type: 'waiting for initialize';
  promise: Promise<void>;
  abortRequest: boolean;
};

export type WaitingStatus<T> = {
  type: 'waiting';
  promise: Promise<void>;
  oldValue: T | undefined;
  abortRequest: boolean;
};

export type StableStatus<T> = {
  type: 'stable';
  value: T;
};

export type ErrorStatus = {
  type: 'error';
  error: Error;
};

export type FiddichStateInstance<T = any> = AtomInstance<T> | SelectorInstance<T>;

export type FiddichStore = {
  id: string;
  name?: string;
  map: Map<string, FiddichStateInstance>;
};

export type SubFiddichStore = Omit<FiddichStore, 'name'> & {
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

type StateOperatorBase<TSource> = {
  state: FiddichState<TSource>;
};

export type SyncAtomOperator<TSource> = StateOperatorBase<TSource> & {
  get: () => TSource;
  set: SyncAtomSetterOrUpdater<TSource>;
  event: EventPublisher<SyncAtomInstanceEvent<TSource>>;
};

export type AsyncAtomOperator<TSource> = StateOperatorBase<TSource> & {
  getAsync: () => Promise<TSource>;
  set: AsyncAtomSetterOrUpdater<TSource>;
  event: EventPublisher<AsyncAtomInstanceEvent<TSource>>;
};

export type SyncSelectorOperator<TSource> = StateOperatorBase<TSource> & {
  get: () => TSource;
  event: EventPublisher<SyncSelectorInstanceEvent<TSource>>;
};

export type AsyncSelectorOperator<TSource> = StateOperatorBase<TSource> & {
  getAsync: () => Promise<TSource>;
  event: EventPublisher<AsyncSelectorInstanceEvent<TSource>>;
};
