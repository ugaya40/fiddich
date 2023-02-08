import { Atom, AtomFamily } from '../atom';
import { useInstance } from './useInstance';
import { useFiddichValueInternal } from './useFiddichValue';
import { SetterOrUpdater, useSetFiddichStateInternal } from './useSetFiddichState';

export const useFiddichState = <T>(atom: Atom<T> | AtomFamily<T>, initialValue?: T): [T, SetterOrUpdater<T>] => {
  const instance = useInstance(atom, initialValue);
  return [useFiddichValueInternal(instance), useSetFiddichStateInternal(instance)];
};
