import { Atoms, SetterOrUpdater } from '../core';
import { useAtomState } from './useAtomState';
import { useFiddichValueInternal } from './useFiddichValue';
import { useSetFiddichStateInternal } from './useSetFiddichState';

export const useFiddichState = <T>(atom: Atoms<T>, initialValue?: T): [T, SetterOrUpdater<T>] => {
  const atomState = useAtomState(atom, initialValue);
  return [useFiddichValueInternal(atomState), useSetFiddichStateInternal(atomState)];
};
