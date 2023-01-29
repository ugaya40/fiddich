import { useEffect } from 'react';
import { Atoms, AtomState } from '../core';
import { useRerender } from '../util/util';
import { useAtomState } from './useAtomState';

export const useFiddichValueInternal = <T>(atomState: AtomState<T>): T => {
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

export const useFiddichValue = <T>(atom: Atoms<T>, initialValue?: T): T => {
  const atomState = useAtomState(atom, initialValue);
  return useFiddichValueInternal(atomState);
};
