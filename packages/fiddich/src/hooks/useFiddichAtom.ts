import { Atom, AtomFamily, AtomSetterOrUpdater } from '../atom';
import { useInstance } from './useInstance';
import { useFiddichValueInternal } from './useFiddichValue';
import { useSetFiddichAtomInternal } from './useSetFiddichAtom';

export const useFiddichAtom = <T>(
  atom: Atom<T> | AtomFamily<T>,
  option?: {
    initialValue?: T;
    withTransition?: boolean;
  }
): [T, AtomSetterOrUpdater<T>] => {
  const instance = useInstance(atom, option?.initialValue);
  return [useFiddichValueInternal(instance, option?.withTransition), useSetFiddichAtomInternal(instance)];
};
