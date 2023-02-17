import { useCallback } from 'react';
import { Atom, AtomFamily, AtomInstance, changeAtomValue, AtomSetterOrUpdater, AtomSetterOrUpdaterArg, AtomFamilySetterOrUpdater } from '../atom';
import { useAtomInstance } from './useInstance';

export const useSetAtomInternal = <T, P>(atomInstance: AtomInstance<T>): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> => {
  const setFunc = useCallback(
    (valueOrUpdater: AtomSetterOrUpdaterArg<T>) => {
      changeAtomValue(atomInstance, valueOrUpdater);
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

export function useSetAtom<T>(atom: Atom<T>, initialValue?: T): AtomSetterOrUpdater<T>;
export function useSetAtom<T, P>(atom: AtomFamily<T, P>, initialValue?: T): AtomFamilySetterOrUpdater<T, P>;
export function useSetAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, false, initialValue);
  return useSetAtomInternal(atomInstance);
}

export function useSetNearestAtom<T>(atom: Atom<T>, initialValue?: T): AtomSetterOrUpdater<T>;
export function useSetNearestAtom<T, P>(atom: AtomFamily<T, P>, initialValue?: T): AtomFamilySetterOrUpdater<T, P>;
export function useSetNearestAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetNearestAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, true, initialValue);
  return useSetAtomInternal(atomInstance);
}
