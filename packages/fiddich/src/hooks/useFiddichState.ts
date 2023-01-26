import { Atom, SetterOrUpdater } from '../core';
import { useFiddichValue } from './useFiddichValue';
import { useSetFiddichState } from './useSetFiddichState';

export const useFiddichState = <T>(atom: Atom<T>): [T, SetterOrUpdater<T>] => {
  return [useFiddichValue(atom), useSetFiddichState(atom)];
};
