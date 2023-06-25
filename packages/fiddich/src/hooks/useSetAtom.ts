import { useCallback, useContext } from 'react';
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
  SyncAtomInstance,
  AsyncAtomInstance,
} from '../atom/atom';
import { FiddichStoreContext, noStoreErrorText } from '../util/const';
import { StorePlaceTypeHookContext, useAtomInstance } from './useInstance';
import { useSetAtomInfoEventEmitter } from '../globalFiddichEvent';
import { useComponentNameIfDev } from './useComponentNameIfDev';
import {
  AsyncAtomSetterOrUpdater,
  AsyncAtomSetterOrUpdaterArg,
  AtomSetterOrUpdater,
  AtomSetterOrUpdaterArg,
  SyncAtomSetterOrUpdater,
  SyncAtomSetterOrUpdaterArg,
  changeAsyncAtomValue,
  changeSyncAtomValue,
} from '../atom/change';

export const useSetAtomInternal = <T>(atomInstance: AtomInstance<T>): AtomSetterOrUpdater<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const componentName = useComponentNameIfDev();

  const setFunc = useCallback(
    (valueOrUpdater: AtomSetterOrUpdaterArg<T>) => {
      useSetAtomInfoEventEmitter.fireTrySetValue(componentName, atomInstance);
      if ('default' in atomInstance.state) {
        changeSyncAtomValue(atomInstance as SyncAtomInstance<T>, valueOrUpdater as SyncAtomSetterOrUpdaterArg<T>);
      } else {
        changeAsyncAtomValue(atomInstance as AsyncAtomInstance<T>, valueOrUpdater as AsyncAtomSetterOrUpdaterArg<T>);
      }
    },
    [atomInstance.id, store.id]
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
  const atomInstance = useAtomInstance({ atom, storePlace: option?.place ?? { type: 'normal' }, initialValue: option?.initialValue });
  return useSetAtomInternal<T>(atomInstance);
}

export type LimitedSetAtomOption<T> = Omit<SetAtomOption<T>, 'place'>;
export type LimitedSetSyncAtomOption<T> = Omit<SetSyncAtomOption<T>, 'place'>;
export type LimitedSetAsyncAtomOption<T> = Omit<SetAsyncAtomOption<T>, 'place'>;

export function useSetHierarchicalAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSetSyncAtomOption<T>): SyncAtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedSetAsyncAtomOption<T>): AsyncAtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetHierarchicalAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({ atom, storePlace: { type: 'hierarchical' }, initialValue: option?.initialValue });
  return useSetAtomInternal<T>(atomInstance);
}

export function useSetRootAtom<T>(atom: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSetSyncAtomOption<T>): SyncAtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedSetAsyncAtomOption<T>): AsyncAtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetRootAtom<T>(atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({ atom, storePlace: { type: 'root' }, initialValue: option?.initialValue });
  return useSetAtomInternal<T>(atomInstance);
}

export function useSetNamedStoreAtom<T>(
  storeName: string,
  atom: SyncAtom<T> | SyncAtomFamily<T, any>,
  option?: LimitedSetSyncAtomOption<T>
): SyncAtomSetterOrUpdater<T>;
export function useSetNamedStoreAtom<T>(
  storeName: string,
  atom: AsyncAtom<T> | AsyncAtomFamily<T, any>,
  option?: LimitedSetAsyncAtomOption<T>
): AsyncAtomSetterOrUpdater<T>;
export function useSetNamedStoreAtom<T>(storeName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetNamedStoreAtom<T>(storeName: string, atom: Atom<T> | AtomFamily<T, any>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T> {
  const atomInstance = useAtomInstance({ atom, storePlace: { type: 'named', name: storeName }, initialValue: option?.initialValue });
  return useSetAtomInternal<T>(atomInstance);
}
