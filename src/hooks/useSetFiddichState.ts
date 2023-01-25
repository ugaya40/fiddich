import { useCallback, useRef } from 'react';
import { Atom, SetterOrUpdater } from '../core';
import { useAtomState } from './useAtomState';

export const useSetFiddichState = <T>(atom: Atom<T>): ((valueOrUpdater: SetterOrUpdater<T>) => void) => {
  const atomState = useAtomState(atom);
  const storeIdRef = useRef(atomState.storeId);

  if (storeIdRef.current !== atomState.storeId) {
    storeIdRef.current = atomState.storeId;
  }

  const setFunc = useCallback(
    (valueOrUpdater: SetterOrUpdater<T>) => {
      const oldValue = atomState.value;
      const newValue = typeof valueOrUpdater === 'function' ? (valueOrUpdater as (old: T) => T)(oldValue) : (valueOrUpdater as T);
      atomState.value = newValue;

      if (oldValue === newValue) return;

      atomState.event.emitAsync({
        type: 'change',
        oldValue,
        newValue,
      });
    },
    [storeIdRef.current]
  );

  return setFunc;
};
