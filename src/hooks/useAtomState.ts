import { useContext } from 'react';
import { assignAtomState, createIndependentAtomState, getAtomState } from '../atom';
import { Atom, AtomState, FiddichStoreContext } from '../core';

export const useAtomState = <T>(atom: Atom<T>): AtomState<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error('');

  const atomStateFromStore = getAtomState<T>(atom, store);
  const atomState = atomStateFromStore ?? createIndependentAtomState(atom);
  if (atomStateFromStore == null) {
    assignAtomState(atomState, store);
  }

  return atomState;
};
