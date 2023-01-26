import { useEffect } from 'react';
import { Atom } from '../core';
import { useRerender } from '../util/util';
import { useAtomState } from './useAtomState';

export const useFiddichValue = <T>(atom: Atom<T>): T => {
  const atomState = useAtomState(atom);
  const rerender = useRerender();

  useEffect(() => {
    const listener = atomState.event.addListener(event => {
      if (event.type === 'change') {
        rerender();
      }
    });

    return () => listener.dispose();
  }, [atomState.storeId]);

  return atomState.value;
};
