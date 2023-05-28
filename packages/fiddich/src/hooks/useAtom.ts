import { AsyncAtom, AsyncAtomFamily, AsyncAtomValueArg, Atom, AtomFamily, SyncAtom, SyncAtomFamily, SyncAtomValueArg } from '../atom/atom';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { SuppressSuspenseOption, useValueInternal } from './useValue';
import { useSetAtomInternal } from './useSetAtom';
import { AsyncAtomSetterOrUpdater, AtomSetterOrUpdater, SyncAtomSetterOrUpdater } from '../atom/change';

export type SyncAtomOption<T> = {
  initialValue?: SyncAtomValueArg<T>;
  place?: StorePlaceTypeHookContext;
};

export type AsyncAtomOption<T> = {
  initialValue?: AsyncAtomValueArg<T>;
  suppressSuspense?: SuppressSuspenseOption;
  place?: StorePlaceTypeHookContext;
};

export type AtomOption<T> = SyncAtomOption<T> | AsyncAtomOption<T>;

export type LimitedSyncAtomOption<T> = Omit<SyncAtomOption<T>, 'place'>;
export type LimitedAsyncAtomOption<T> = Omit<AsyncAtomOption<T>, 'place'>;
export type LimitedAtomOption<T> = LimitedSyncAtomOption<T> | LimitedAsyncAtomOption<T>;

export function useAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: SyncAtomOption<T>): [T, SyncAtomSetterOrUpdater<T>];
export function useAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: AsyncAtomOption<T>): [T, AsyncAtomSetterOrUpdater<T>];
export function useAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: AtomOption<T>): [T, AtomSetterOrUpdater<T>];
export function useAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: AtomOption<T>): [T, AtomSetterOrUpdater<T>] {
  if (option != null) {
    const suppressSuspenseWhenReset = 'suppressSuspense' in option ? option.suppressSuspense?.onReset ?? false : false;
    const suppressSuspenseWhenChange = 'suppressSuspense' in option ? option.suppressSuspense?.onChange ?? false : false;
    const initialValue = 'initialValue' in option ? option.initialValue : undefined;

    const instance = useInstance(atom, option?.place ?? { type: 'normal' }, initialValue);
    return [useValueInternal(instance, suppressSuspenseWhenReset, suppressSuspenseWhenChange), useSetAtomInternal(instance)];
  } else {
    const instance = useInstance(atom, { type: 'normal' });
    return [useValueInternal(instance, false, false), useSetAtomInternal(instance)];
  }
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
