import { Atom, AtomFamily, AtomSetterOrUpdater } from '../atom';
import { useInstance } from './useInstance';
import { useValueInternal } from './useValue';
import { useSetAtomInternal } from './useSetAtom';

export const useAtom = <T>(
  atom: Atom<T> | AtomFamily<T>,
  option?: {
    initialValue?: T;
    withTransition?: boolean;
  }
): [T, AtomSetterOrUpdater<T>] => {
  const instance = useInstance(atom, false, option?.initialValue);
  return [useValueInternal(instance, option?.withTransition), useSetAtomInternal(instance)];
};

export const useNearestAtom = <T>(
  atom: Atom<T> | AtomFamily<T>,
  option?: {
    initialValue?: T;
    withTransition?: boolean;
  }
): [T, AtomSetterOrUpdater<T>] => {
  const instance = useInstance(atom, true, option?.initialValue);
  return [useValueInternal(instance, option?.withTransition), useSetAtomInternal(instance)];
};
