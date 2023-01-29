import { useCallback } from 'react';
import { changeValue } from '../atom';
import { Atoms, AtomState, SetterOrUpdater } from '../core';
import { useAtomState } from './useAtomState';

export const useSetFiddichStateInternal = <T>(atomState: AtomState<T>): SetterOrUpdater<T> => {
  const setFunc = useCallback(
    (valueOrUpdater: ((old: T) => T) | T) => {
      changeValue(atomState, valueOrUpdater);
    },
    [atomState.storeId]
  );

  return setFunc;
};

export const useSetFiddichState = <T>(atom: Atoms<T>, initialValue?: T): SetterOrUpdater<T> => {
  const atomState = useAtomState(atom, initialValue);
  return useSetFiddichStateInternal(atomState);
};
