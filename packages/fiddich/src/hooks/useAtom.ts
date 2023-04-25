import {
  AsyncAtom,
  AsyncAtomFamily,
  AsyncAtomSetterOrUpdater,
  AsyncAtomValueArg,
  Atom,
  AtomFamily,
  AtomSetterOrUpdater,
  SyncAtom,
  SyncAtomFamily,
  SyncAtomSetterOrUpdater,
  SyncAtomValueArg,
} from '../atom';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useValueInternal } from './useValue';
import { useSetAtomInternal } from './useSetAtom';

export type AtomOption<T> = {
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>;
  suppressSuspense?: boolean;
  place?: StorePlaceTypeHookContext;
};

export type SyncAtomOption<T> = Omit<AtomOption<T>, 'suppressSuspense'> & {
  initialValue?: SyncAtomValueArg<T>;
};
export type AsyncAtomOption<T> = AtomOption<T> & {
  initialValue?: AsyncAtomValueArg<T>;
};

export type LimitedAtomOption<T> = Omit<AtomOption<T>, 'place'>;
export type LimitedSyncAtomOption<T> = Omit<SyncAtomOption<T>, 'place'>;
export type LimitedAsyncAtomOption<T> = Omit<AsyncAtomOption<T>, 'place'>;

export function useAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: SyncAtomOption<T>): [T, SyncAtomSetterOrUpdater<T>];
export function useAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: AsyncAtomOption<T>): [T, AsyncAtomSetterOrUpdater<T>];
export function useAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: AtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: AtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  const instance = useInstance(atom, option?.place ?? { type: 'normal' }, option?.initialValue);
  return [useValueInternal(instance, option?.suppressSuspense), useSetAtomInternal(instance)];
}

export function useHierarchicalAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomOption<T>): [T, SyncAtomSetterOrUpdater<T>];
export function useHierarchicalAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomOption<T>): [T, AsyncAtomSetterOrUpdater<T>];
export function useHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  return useAtom(atom, { ...option, place: { type: 'hierarchical' } });
}

export function useRootAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomOption<T>): [T, SyncAtomSetterOrUpdater<T>];
export function useRootAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomOption<T>): [T, AsyncAtomSetterOrUpdater<T>];
export function useRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  return useAtom(atom, { ...option, place: { type: 'root' } });
}

export function useNamedStoreAtom<T>(
  storeName: string,
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  option?: LimitedSyncAtomOption<T>
): [T, SyncAtomSetterOrUpdater<T>];
export function useNamedStoreAtom<T>(
  storeName: string,
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  option?: LimitedAsyncAtomOption<T>
): [T, AsyncAtomSetterOrUpdater<T>];
export function useNamedStoreAtom<T>(storeName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useNamedStoreAtom<T>(storeName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  return useAtom(atom, { ...option, place: { type: 'named', name: storeName } });
}

export function useContextAtom<T>(
  contextKey: string,
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  option?: LimitedSyncAtomOption<T>
): [T, SyncAtomSetterOrUpdater<T>];
export function useContextAtom<T>(
  contextKey: string,
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  option?: LimitedAsyncAtomOption<T>
): [T, AsyncAtomSetterOrUpdater<T>];
export function useContextAtom<T>(contextKey: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useContextAtom<T>(contextKey: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  return useAtom(atom, { ...option, place: { type: 'context', key: contextKey } });
}
