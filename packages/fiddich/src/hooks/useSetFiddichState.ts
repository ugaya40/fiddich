import { useCallback } from 'react';
import { Atom, SetterOrUpdater } from '../core';
import { useAtomState } from './useAtomState';

export const useSetFiddichState = <T>(atom: Atom<T>): SetterOrUpdater<T> => {
  const atomState = useAtomState(atom);

  const setFunc = useCallback(
    (valueOrUpdater: ((old: T) => T) | T) => {
      const oldValue = atomState.value;
      const newValue = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (old: T) => T)(oldValue) : valueOrUpdater;

      if (oldValue === newValue) return;

      atomState.value = newValue;

      atomState.event.emitAsync({
        type: 'change',
        oldValue,
        newValue,
      });
    },
    [atomState.storeId]
  );

  return setFunc;
};
