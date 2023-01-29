import { useContext } from 'react';
import { assignAtomState, createIndependentAtomState, getAtomState } from '../atom';
import { Atoms, AtomState, FiddichStoreContext } from '../core';

export const useAtomState = <T>(atom: Atoms<T>, initialValue?: T): AtomState<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error('Component is not inside the FiddichRoot/SubFiddichRoot.');

  const atomStateFromStore = getAtomState<T>(atom, store);
  const atomState = atomStateFromStore ?? createIndependentAtomState(atom, initialValue);
  if (atomStateFromStore == null) {
    assignAtomState(atomState, store);
  }

  return atomState;
};
