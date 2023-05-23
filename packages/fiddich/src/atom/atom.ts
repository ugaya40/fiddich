import {
  CellFactory,
  ChangedByPromiseEventArg,
  ChangedEventArg,
  Compare,
  ErrorEventArg,
  ErrorStatus,
  InitializedEventArg,
  ResetEventArg,
  StableStatus,
  Store,
  UnknownStatus,
  WaitingEventArg,
  WaitingForInitializeStatus,
  WaitingStatus,
} from '../shareTypes';
import { EffectsType, FamilyEffectsTypes } from '../stateUtil/instanceOperation';
import { EventPublisher } from '../util/event';
import { NotFunction, StrictUnion, generateRandomKey } from '../util/util';

export type SyncAtomValueArg<T> = Awaited<NotFunction<T>> | (() => Awaited<T>);
export type AsyncAtomValueArg<T> = Promise<NotFunction<T>> | Awaited<NotFunction<T>> | (() => Promise<T> | Awaited<T>);

type AtomBase<T, TCell> = {
  type: 'atom';
  key: string;
  name?: string;
  cell: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: EffectsType<T, TCell>;
};

export type SyncAtom<T, TCell = undefined> = AtomBase<T, TCell> & {
  default: SyncAtomValueArg<T>;
};

export type AsyncAtom<T, TCell = undefined> = AtomBase<T, TCell> & {
  asyncDefault: AsyncAtomValueArg<T>;
};

export type Atom<T = unknown, TCell = any> = SyncAtom<T, TCell> | AsyncAtom<T, TCell>;

type AtomArgBase<T, TCell> = {
  name?: string;
  compare?: Compare<T>;
  cell?: CellFactory<TCell>;
  effects?: EffectsType<T, TCell>;
};

export type SyncAtomArg<T, TCell = any> = AtomArgBase<T, TCell> & {
  default: SyncAtomValueArg<T>;
};
export type AsyncAtomArg<T, TCell = any> = AtomArgBase<T, TCell> & {
  asyncDefault: AsyncAtomValueArg<T>;
};

export type AtomArg<T, TCell = any> = StrictUnion<SyncAtomArg<T, TCell> | AsyncAtomArg<T, TCell>>;

export function atom<T, TCell = undefined>(arg: SyncAtomArg<T, TCell>): SyncAtom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AsyncAtomArg<T, TCell>): AsyncAtom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AtomArg<T, TCell>): Atom<T, TCell>;
export function atom<T, TCell = undefined>(arg: AtomArg<T, TCell>): Atom<T, TCell> {
  const { cell, ...other } = arg;
  const result: Atom<T, TCell> = {
    key: generateRandomKey(),
    ...other,
    cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
    type: 'atom',
  };

  return result;
}

export type SyncAtomFamilyValueArg<T, P> = Awaited<T> | ((arg: P) => Awaited<T>);
export type AsyncAtomFamilyValueArg<T, P> = Promise<T> | Awaited<T> | ((arg: P) => Promise<T> | Awaited<T>);

type AtomFamilyBase<T, P, TCell> = {
  type: 'atomFamily';
  key: string;
  name?: string;
  baseKey: string;
  parameter: P;
  cell: CellFactory<TCell>;
  parameterString: string;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncAtomFamily<T, P, TCell = undefined> = AtomFamilyBase<T, P, TCell> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamily<T, P, TCell = undefined> = AtomFamilyBase<T, P, TCell> & {
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamily<T = unknown, P = unknown, TCell = undefined> = SyncAtomFamily<T, P, TCell> | AsyncAtomFamily<T, P, TCell>;

export type AtomFamilyArgBase<T, P, TCell> = {
  name?: string;
  stringfy?: (arg: P) => string;
  cell?: CellFactory<TCell>;
  compare?: Compare<T>;
  effects?: FamilyEffectsTypes<T, P, TCell>;
};

export type SyncAtomFamilyArg<T, P, TCell> = AtomFamilyArgBase<T, P, TCell> & {
  default: SyncAtomFamilyValueArg<T, P>;
};

export type AsyncAtomFamilyArg<T, P, TCell> = AtomFamilyArgBase<T, P, TCell> & {
  asyncDefault: AsyncAtomFamilyValueArg<T, P>;
};

export type AtomFamilyArg<T, P, TCell> = SyncAtomFamilyArg<T, P, TCell> | AsyncAtomFamilyArg<T, P, TCell>;

export type SyncAtomFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => SyncAtomFamily<T, P, TCell>;
export type AsyncAtomFamilyFunction<T = unknown, P = unknown, TCell = undefined> = (arg: P) => AsyncAtomFamily<T, P, TCell>;
export type AtomFamilyFunction<T = any, P = any, TCell = undefined> = (arg: P) => AtomFamily<T, P, TCell>;

export function atomFamily<T, P, TCell = undefined>(arg: SyncAtomFamilyArg<T, P, TCell>): SyncAtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AsyncAtomFamilyArg<T, P, TCell>): AsyncAtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AtomFamilyArg<T, P, TCell>): AtomFamilyFunction<T, P, TCell>;
export function atomFamily<T, P, TCell = undefined>(arg: AtomFamilyArg<T, P, TCell>): AtomFamilyFunction<T, P, TCell> {
  const baseKey = generateRandomKey();
  const { stringfy, cell, ...other } = arg;
  const result: AtomFamilyFunction<T, P, TCell> = parameter => {
    const parameterString = stringfy != null ? stringfy(parameter) : `${JSON.stringify(parameter)}`;
    const key = `${baseKey}-familyKey-${parameterString}`;
    return {
      ...other,
      cell: (cell ?? (() => undefined)) as CellFactory<TCell>,
      parameter,
      stringfy,
      key,
      parameterString,
      baseKey,
      type: 'atomFamily',
    };
  };

  return result;
}

type SyncAtomInstanceStatus<T> = UnknownStatus | StableStatus<T> | ErrorStatus;
type AsyncAtomInstanceStatus<T> = UnknownStatus | WaitingForInitializeStatus<T> | StableStatus<T> | WaitingStatus<T> | ErrorStatus;

export type SyncAtomInstanceEvent<T> = InitializedEventArg<T> | ChangedEventArg<T> | ErrorEventArg | ResetEventArg;
export type AsyncAtomInstanceEvent<T> = InitializedEventArg<T> | WaitingEventArg | ChangedByPromiseEventArg<T> | ErrorEventArg | ResetEventArg;

export type SyncAtomInstance<T = unknown, TCell = any> = {
  id: string;
  state: SyncAtom<T, TCell> | SyncAtomFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  status: SyncAtomInstanceStatus<T>;
  event: EventPublisher<SyncAtomInstanceEvent<T>>;
};

export type AsyncAtomInstance<T = unknown, TCell = any> = {
  id: string;
  state: AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>;
  cell: TCell;
  store: Store;
  status: AsyncAtomInstanceStatus<T>;
  event: EventPublisher<AsyncAtomInstanceEvent<T>>;
};

export type AtomInstance<T = unknown, TCell = any> = SyncAtomInstance<T, TCell> | AsyncAtomInstance<T, TCell>;
