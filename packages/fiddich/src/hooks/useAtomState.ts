import { useContext } from 'react';
import { assignAtomState, createIndependentAtomState, getAtomState } from '../atom';
import { Atom, AtomState, AtomStateEffect, FiddichStoreContext } from '../core';

export const useAtomState = <T>(atom: Atom<T>, initialValue?: T, effect?: AtomStateEffect<T>): AtomState<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error('Component is not inside the FiddichRoot/SubFiddichRoot.');

  const atomStateFromStore = getAtomState<T>(atom, store);
  const atomState = atomStateFromStore ?? createIndependentAtomState(atom, initialValue, effect);
  if (atomStateFromStore == null) {
    assignAtomState(atomState, store);
  }

  return atomState;
};
