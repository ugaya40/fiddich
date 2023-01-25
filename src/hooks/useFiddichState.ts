import { Atom, SetterOrUpdater } from '../core';
import { useFiddichValue } from './useFiddichValue';
import { useSetFiddichState } from './useSetFiddichState';

export const useFiddichState = <T>(atom: Atom<T>): [T, (valueOrUpdater: SetterOrUpdater<T>) => void] => {
  const value = useFiddichValue(atom);
  const setFunc = useSetFiddichState(atom);
  return [value, setFunc];
};
