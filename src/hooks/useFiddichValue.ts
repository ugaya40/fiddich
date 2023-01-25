import { useEffect, useRef } from 'react';
import { Atom } from '../core';
import { useRerender } from '../util/util';
import { useAtomState } from './useAtomState';

export const useFiddichValue = <T>(atom: Atom<T>): T => {
  const atomState = useAtomState(atom);
  const storeIdRef = useRef(atomState.storeId);
  const rerender = useRerender();

  const listenerRef = useRef(
    atomState.event.addListener(event => {
      if (event.type === 'change') {
        rerender();
      }
    })
  );

  if (storeIdRef.current !== atomState.storeId) {
    storeIdRef.current = atomState.storeId;
    listenerRef.current.dispose();
    listenerRef.current = atomState.event.addListener(event => {
      if (event.type === 'change') {
        rerender();
      }
    });
  }

  useEffect(() => {
    return () => listenerRef.current.dispose();
  }, []);

  return atomState.value;
};
