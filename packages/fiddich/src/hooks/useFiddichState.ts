import { Atom, AtomStateEffect, SetterOrUpdater } from '../core';
import { useAtomState } from './useAtomState';
import { useFiddichValueInternal } from './useFiddichValue';
import { useSetFiddichStateInternal } from './useSetFiddichState';

export const useFiddichState = <T>(atom: Atom<T>, initialValue?: T, effect?: AtomStateEffect<T>): [T, SetterOrUpdater<T>] => {
  const atomState = useAtomState(atom, initialValue, effect);
  return [useFiddichValueInternal(atomState), useSetFiddichStateInternal(atomState)];
};
