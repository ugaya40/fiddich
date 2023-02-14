import { useCallback } from 'react';
import { Atom, AtomFamily, AtomInstance, changeAtomValue, AtomSetterOrUpdater, AtomSetterOrUpdaterArg, AtomFamilySetterOrUpdater } from '../atom';
import { useAtomInstance } from './useInstance';

export const useSetFiddichAtomInternal = <T, P>(atomInstance: AtomInstance<T>): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> => {
  const setFunc = useCallback(
    (valueOrUpdater: AtomSetterOrUpdaterArg<T>) => {
      changeAtomValue(atomInstance, valueOrUpdater);
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

export function useSetFiddichAtom<T>(atom: Atom<T>, initialValue?: T): AtomSetterOrUpdater<T>;
export function useSetFiddichAtom<T, P>(atom: AtomFamily<T, P>, initialValue?: T): AtomFamilySetterOrUpdater<T, P>;
export function useSetFiddichAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetFiddichAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, initialValue?: T): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, initialValue);
  return useSetFiddichAtomInternal(atomInstance);
}
