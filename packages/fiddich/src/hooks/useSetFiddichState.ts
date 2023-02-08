import { useCallback } from 'react';
import { Atom, AtomFamily, AtomInstance, changeAtomValue } from '../atom';
import { useAtomInstance } from './useInstance';

export type SetterOrUpdater<T> = (setterOrUpdater: ((old: T) => T) | T) => void;

export const useSetFiddichStateInternal = <T>(atomInstance: AtomInstance<T>): SetterOrUpdater<T> => {
  const setFunc = useCallback(
    (valueOrUpdater: ((old: T) => T) | T) => {
      changeAtomValue(atomInstance, valueOrUpdater);
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

export const useSetFiddichState = <T>(atom: Atom<T> | AtomFamily<T>, initialValue?: T): SetterOrUpdater<T> => {
  const atomInstance = useAtomInstance(atom, initialValue);
  return useSetFiddichStateInternal(atomInstance);
};
