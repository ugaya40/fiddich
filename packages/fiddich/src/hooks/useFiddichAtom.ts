import { Atom, AtomFamily } from '../atom';
import { useInstance } from './useInstance';
import { useFiddichValueInternal } from './useFiddichValue';
import { SetterOrUpdater, useSetFiddichAtomInternal } from './useSetFiddichAtom';

export const useFiddichAtom = <T>(atom: Atom<T> | AtomFamily<T>, initialValue?: T): [T, SetterOrUpdater<T>] => {
  const instance = useInstance(atom, initialValue);
  return [useFiddichValueInternal(instance), useSetFiddichAtomInternal(instance)];
};
