import { useCallback } from 'react';
import { Atom, AtomFamily, AtomInstance, changeAtomValue } from '../atom';
import { useAtomInstance } from './useInstance';

export type SetterOrUpdater<T> = (setterOrUpdater: ((old: T | undefined) => T) | T) => void;

export const useSetFiddichAtomInternal = <T>(atomInstance: AtomInstance<T>): SetterOrUpdater<T> => {
  const setFunc = useCallback(
    (valueOrUpdater: ((old: T | undefined) => T) | T) => {
      changeAtomValue(atomInstance, valueOrUpdater);
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

export const useSetFiddichAtom = <T>(atom: Atom<T> | AtomFamily<T>, initialValue?: T): SetterOrUpdater<T> => {
  const atomInstance = useAtomInstance(atom, initialValue);
  return useSetFiddichAtomInternal(atomInstance);
};
