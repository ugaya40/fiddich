import { useCallback } from 'react';
import { changeValue } from '../atom';
import { Atom, AtomState, AtomStateEffect, SetterOrUpdater } from '../core';
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

export const useSetFiddichState = <T>(atom: Atom<T>, initialValue?: T, effect?: AtomStateEffect<T>): SetterOrUpdater<T> => {
  const atomState = useAtomState(atom, initialValue, effect);
  return useSetFiddichStateInternal(atomState);
};
