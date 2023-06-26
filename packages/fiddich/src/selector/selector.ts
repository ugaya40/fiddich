import {
  CellFactory,
  ChangedByPromiseEventArg,
  ChangedEventArg,
  Compare,
  ErrorEventArg,
  ErrorStatus,
  FiddichState,
  FiddichStateInstance,
  InitializedEventArg,
  ResetEventArg,
  StableStatus,
  Store,
  SyncFiddichState,
  UnknownStatus,
  WaitingEventArg,
  WaitingForInitializeStatus,
  WaitingStatus,
} from '../shareTypes';
import { BasicOperationArgType, EffectsType, FamilyEffectsTypes } from '../stateUtil/instanceOperation';
import { Disposable, EventPublisher } from '../util/event';
import { StrictUnion, generateRandomKey } from '../util/util';

export type GetState = <TSource>(arg: SyncFiddichState<TSource>) => TSource;
export type GetStateAsync = <TSource>(arg: FiddichState<TSource>) => Promise<TSource>;

type GetArgBaseType<TGetType extends GetState | GetStateAsync, TCell> = BasicOperationArgType & {
  get: TGetType;
  hierarchical: { get: TGetType } & Omit<BasicOperationArgType, 'resetStore'>;
  root: { get: TGetType } & BasicOperationArgType;
  named: (name: string) => { get: TGetType } & BasicOperationArgType;
  cell: TCell;
};

export type SyncSelectorGetArgsType<TCell> = GetArgBaseType<GetState, TCell>;
export type AsyncSelectorGetArgsType<TCell> = GetArgBaseType<GetStateAsync, TCell>;

type SelectorBase<T, TCell> = {
  type: 'selector';
  key: string;
  name?: string;
  cell: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncSelector<T, TCell = undefined> = SelectorBase<T, TCell> & {
  get: (arg: SyncSelectorGetArgsType<TCell>) => Awaited<T>;
};

export type AsyncSelector<T, TCell = undefined> = SelectorBase<T, TCell> & {
  getAsync: (arg: AsyncSelectorGetArgsType<TCell>) => Promise<T>;
};

export type Selector<T = any, TCell = undefined> = SyncSelector<T, TCell> | AsyncSelector<T, TCell>;

type SelectorArgBase<T, TCell> = {
  name?: string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncSelectorArg<T, TCell = undefined> = SelectorArgBase<T, TCell> & {
  get: (arg: SyncSelectorGetArgsType<TCell>) => Awaited<T>;
};

export type AsyncSelectorArg<T, TCell = undefined> = SelectorArgBase<T, TCell> & {
  getAsync: (arg: AsyncSelectorGetArgsType<TCell>) => Promise<T>;
};

export type SelectorArg<T, TCell = any> = StrictUnion<SyncSelectorArg<T, TCell> | AsyncSelectorArg<T, TCell>>;

export function selector<T, TCell = undefined>(arg: AsyncSelectorArg<T, TCell>): AsyncSelector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SyncSelectorArg<T, TCell>): SyncSelector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SelectorArg<T, TCell>): Selector<T, TCell>;
export function selector<T, TCell = undefined>(arg: SelectorArg<T, TCell>): Selector<T, TCell> {
  const { cell, ...other } = arg;
  return {
    key: generateRandomKey(),
    type: 'selector',
    cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
    ...other,
  };
}

type SelectorFamilyBase<T = unknown, P = unknown, TCell = any> = {
  type: 'selectorFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  cell: CellFactory<TCell>;
  parameterString: string;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

type AsyncSelectorFamilyGetArgsType<T, P, TCell> = AsyncSelectorGetArgsType<TCell> & {
  param: P;
};
type SyncSelectorFamilyGetArgsType<T, P, TCell> = SyncSelectorGetArgsType<TCell> & {
  param: P;
};

export type SyncSelectorFamily<T = unknown, P = unknown, TCell = undefined> = SelectorFamilyBase<T, P, TCell> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P, TCell>) => T;
};

export type AsyncSelectorFamily<T = unknown, P = unknown, TCell = undefined> = SelectorFamilyBase<T, P, TCell> & {
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P, TCell>) => Promise<T>;
};

export type SelectorFamily<T = unknown, P = unknown, TCell = undefined> = SyncSelectorFamily<T, P, TCell> | AsyncSelectorFamily<T, P, TCell>;

type SelectorFamilyArgBase<T, P, TCell> = {
  name?: string;
  stringfy?: (arg: P) => string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncSelectorFamilyArg<T, P, TCell> = SelectorFamilyArgBase<T, P, TCell> & {
  get: (arg: SyncSelectorFamilyGetArgsType<T, P, TCell>) => Awaited<T>;
};

export type AsyncSelectorFamilyArg<T, P, TCell> = SelectorFamilyArgBase<T, P, TCell> & {
  getAsync: (arg: AsyncSelectorFamilyGetArgsType<T, P, TCell>) => Promise<T>;
};

export type SelectorFamilyArg<T, P, TCell> = SyncSelectorFamilyArg<T, P, TCell> | AsyncSelectorFamilyArg<T, P, TCell>;

export type SyncSelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SyncSelectorFamily<T, P, TCell>;
export type AsyncSelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => AsyncSelectorFamily<T, P, TCell>;
export type SelectorFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SelectorFamily<T, P, TCell>;

export function selectorFamily<T, P, TCell = undefined>(arg: SyncSelectorFamilyArg<T, P, TCell>): SyncSelectorFamilyFunction<T, P, TCell>;
export function selectorFamily<T, P, TCell = undefined>(arg: AsyncSelectorFamilyArg<T, P, TCell>): AsyncSelectorFamilyFunction<T, P, TCell>;
export function selectorFamily<T, P, TCell = undefined>(arg: SelectorFamilyArg<T, P, TCell>): SelectorFamilyFunction<T, P, TCell> {
  const baseKey = generateRandomKey();
  const { stringfy, cell, ...other } = arg;
  const result: SelectorFamilyFunction<T, P, TCell> = parameter => {
    const parameterString = stringfy != null ? stringfy(parameter) : `${JSON.stringify(parameter)}`;
    const key = `${baseKey}-familyKey-${parameterString}`;
    return {
      ...other,
      cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
      key,
      baseKey,
      parameterString,
      parameter,
      type: 'selectorFamily',
    };
  };

  return result;
}

type SyncSelectorInstanceStatus<T> = UnknownStatus | StableStatus<T> | ErrorStatus;
type AsyncSelectorInstanceStatus<T> = UnknownStatus | WaitingForInitializeStatus<T> | StableStatus<T> | WaitingStatus<T> | ErrorStatus;

export type SyncSelectorInstanceEvent<T> = InitializedEventArg<T> | ChangedEventArg<T> | ErrorEventArg | ResetEventArg;
export type AsyncSelectorInstanceEvent<T> = InitializedEventArg<T> | WaitingEventArg | ChangedByPromiseEventArg<T> | ErrorEventArg | ResetEventArg;

export type SyncSelectorInstance<T = unknown, TCell = any> = {
  id: string;
  state: SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  event: EventPublisher<SyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: SyncSelectorInstanceStatus<T>;
};

export type AsyncSelectorInstance<T = unknown, TCell = any> = {
  id: string;
  state: AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  event: EventPublisher<AsyncSelectorInstanceEvent<T>>;
  stateListeners: Map<string, { instance: FiddichStateInstance<any>; listener: Disposable }>;
  status: AsyncSelectorInstanceStatus<T>;
};

export type SelectorInstance<T = any, TCell = any> = SyncSelectorInstance<T, TCell> | AsyncSelectorInstance<T, TCell>;
