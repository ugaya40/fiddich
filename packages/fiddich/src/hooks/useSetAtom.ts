import { useCallback } from 'react';
import {
  Atom,
  AtomFamily,
  AtomInstance,
  SyncAtomValueArg,
  AsyncAtomValueArg,
  AsyncAtomFamily,
  SyncAtomFamily,
  SyncAtom,
  AsyncAtom,
  SyncAtomSetterOrUpdater,
  AsyncAtomSetterOrUpdater,
  AtomSetterOrUpdater,
  AtomSetterOrUpdaterArg,
  changeSyncAtomValue,
  SyncAtomInstance,
  changeAsyncAtomValue,
  AsyncAtomInstance,
  SyncAtomSetterOrUpdaterArg,
  AsyncAtomSetterOrUpdaterArg,
} from '../atom';
import { StorePlaceTypeHookContext, useAtomInstance } from './useInstance';

export const useSetAtomInternal = <T>(atomInstance: AtomInstance<T>): AtomSetterOrUpdater<T> => {
  const setFunc = useCallback(
    (valueOrUpdater: AtomSetterOrUpdaterArg<T>) => {
      if ('default' in atomInstance.state) {
        changeSyncAtomValue(atomInstance as SyncAtomInstance<T>, valueOrUpdater as SyncAtomSetterOrUpdaterArg<T>);
      } else {
        changeAsyncAtomValue(atomInstance as AsyncAtomInstance<T>, valueOrUpdater as AsyncAtomSetterOrUpdaterArg<T>);
      }
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

export type SetAtomOption<T> = {
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>;
  place?: StorePlaceTypeHookContext;
};

export type SetSyncAtomOption<T> = SetAtomOption<T> & {
  initialValue?: SyncAtomValueArg<T>;
};
export type SetAsyncAtomOption<T> = SetAtomOption<T> & {
  initialValue?: AsyncAtomValueArg<T>;
};

export function useSetAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: SetSyncAtomOption<T>): SyncAtomSetterOrUpdater<T>;
export function useSetAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: SetAsyncAtomOption<T>): AsyncAtomSetterOrUpdater<T>;
export function useSetAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: SetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: SetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({
    atom,
    storePlace: option?.place ?? { type: 'normal' },
    initialValue: option?.initialValue,
  });
  return useSetAtomInternal(atomInstance);
}

export type LimitedSetAtomOption<T> = Omit<SetAtomOption<T>, 'place'>;
export type LimitedSetSyncAtomOption<T> = Omit<SetSyncAtomOption<T>, 'place'>;
export type LimitedSetAsyncAtomOption<T> = Omit<SetAsyncAtomOption<T>, 'place'>;

export function useSetHierarchicalAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSetSyncAtomOption<T>): SyncAtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedSetAsyncAtomOption<T>): AsyncAtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({
    atom,
    storePlace: { type: 'hierarchical' },
    initialValue: option?.initialValue,
  });
  return useSetAtomInternal(atomInstance);
}

export function useSetRootAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSetSyncAtomOption<T>): SyncAtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedSetAsyncAtomOption<T>): AsyncAtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({
    atom,
    storePlace: { type: 'root' },
    initialValue: option?.initialValue,
  });
  return useSetAtomInternal(atomInstance);
}
export function useSetNamedRootAtom<T>(
  rootName: string,
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  option?: LimitedSetSyncAtomOption<T>
): SyncAtomSetterOrUpdater<T>;
export function useSetNamedRootAtom<T>(
  rootName: string,
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  option?: LimitedSetAsyncAtomOption<T>
): AsyncAtomSetterOrUpdater<T>;
export function useSetNamedRootAtom<T>(rootName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetNamedRootAtom<T>(rootName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({
    atom,
    storePlace: { type: 'named', name: rootName },
    initialValue: option?.initialValue,
  });
  return useSetAtomInternal(atomInstance);
}
