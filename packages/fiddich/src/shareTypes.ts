import {
  AsyncAtom,
  AsyncAtomFamily,
  AsyncAtomInstance,
  AsyncAtomInstanceEvent,
  Atom,
  AtomFamily,
  AtomInstance,
  SyncAtom,
  SyncAtomFamily,
  SyncAtomInstance,
  SyncAtomInstanceEvent,
} from './atom/atom';
import { EventPublisher } from './util/event';
import {
  AsyncSelector,
  AsyncSelectorFamily,
  AsyncSelectorInstance,
  AsyncSelectorInstanceEvent,
  Selector,
  SelectorFamily,
  SelectorInstance,
  SyncSelector,
  SyncSelectorFamily,
  SyncSelectorInstance,
  SyncSelectorInstanceEvent,
} from './selector/selector';
import { AsyncAtomSetterOrUpdater, SyncAtomSetterOrUpdater } from './atom/change';

export type FiddichState<T = any, TCell = any> = Atom<T, TCell> | AtomFamily<T, any, TCell> | Selector<T, TCell> | SelectorFamily<T, any, TCell>;
export type SyncFiddichState<T = any, TCell = any> =
  | SyncAtom<T, TCell>
  | SyncAtomFamily<T, any, TCell>
  | SyncSelector<T, TCell>
  | SyncSelectorFamily<T, any, TCell>;
export type AsyncFiddichState<T = any, TCell = any> =
  | AsyncAtom<T, TCell>
  | AsyncAtomFamily<T, any, TCell>
  | AsyncSelector<T, TCell>
  | AsyncSelectorFamily<T, any, TCell>;

export type ResetEventArg = {
  type: 'reset';
};

export type InitializedEventArg<T = any> = {
  type: 'initialized';
  value: T;
  oldValue: T | undefined;
};

export type WaitingEventArg = {
  type: 'waiting';
  promise: Promise<void>;
};

export type ChangedEventArg<T = any> = {
  type: 'change';
  oldValue: T | undefined;
  newValue: T;
};

export type ChangedByPromiseEventArg<T = any> = {
  type: 'change by promise';
  oldValue: T | undefined;
  newValue: T;
};

export type ErrorEventArg = {
  type: 'error';
  error: Error;
};

export type InstanceEventArgs = InitializedEventArg | ChangedEventArg | ResetEventArg | ErrorEventArg | WaitingEventArg | ChangedByPromiseEventArg;

export type Compare<T> = (oldValue: T | undefined, newValue: T) => boolean;

export type UnknownStatus = {
  type: 'unknown';
};

export type WaitingForInitializeStatus<T> = {
  type: 'waiting for initialize';
  oldValue: T | undefined;
  promise: Promise<void>;
  abortRequest: boolean;
};

export type WaitingStatus<T> = {
  type: 'waiting';
  promise: Promise<void>;
  oldValue: T;
  isInitialized: boolean;
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

export type CellFactory<T> = () => T;

export type FiddichStateInstance<T = any, TCell = any> = AtomInstance<T, TCell> | SelectorInstance<T, TCell>;

type StoreBase = {
  id: string;
  map: Map<string, FiddichStateInstance>;
  event: EventPublisher<'finalize'>;
};

export type FiddichStore = StoreBase & {
  name?: string;
};

export type SubFiddichStore = StoreBase & {
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
  reset: () => void;
  instance: SyncAtomInstance<TSource>;
  event: EventPublisher<SyncAtomInstanceEvent<TSource>>;
};

export type AsyncAtomOperator<TSource> = StateOperatorBase<TSource> & {
  getAsync: () => Promise<TSource>;
  set: AsyncAtomSetterOrUpdater<TSource>;
  reset: () => void;
  instance: AsyncAtomInstance<TSource>;
  event: EventPublisher<AsyncAtomInstanceEvent<TSource>>;
};

export type SyncSelectorOperator<TSource> = StateOperatorBase<TSource> & {
  get: () => TSource;
  reset: () => void;
  instance: SyncSelectorInstance<TSource>;
  event: EventPublisher<SyncSelectorInstanceEvent<TSource>>;
};

export type AsyncSelectorOperator<TSource> = StateOperatorBase<TSource> & {
  getAsync: () => Promise<TSource>;
  reset: () => void;
  instance: AsyncSelectorInstance<TSource>;
  event: EventPublisher<AsyncSelectorInstanceEvent<TSource>>;
};
