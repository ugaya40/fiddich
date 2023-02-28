import { Atom, AtomFamily, AtomSetterOrUpdater } from '../atom';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useValueInternal } from './useValue';
import { useSetAtomInternal } from './useSetAtom';

export type AtomOption<T> = {
  initialValue?: T;
  noSuspense?: boolean;
  place?: StorePlaceTypeHookContext;
};

export type LimitedAtomOption<T> = Omit<AtomOption<T>, 'place'>;

export const useAtom = <T>(atom: Atom<T> | AtomFamily<T>, option?: AtomOption<T>): [T, AtomSetterOrUpdater<T>] => {
  const instance = useInstance(atom, option?.place ?? { type: 'normal' }, option?.initialValue);
  return [useValueInternal(instance, option?.noSuspense), useSetAtomInternal(instance)];
};

export const useHierarchicalAtom = <T>(atom: Atom<T> | AtomFamily<T>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] => {
  return useAtom(atom, { ...option, place: { type: 'hierarchical' } });
};

export const useRootAtom = <T>(atom: Atom<T> | AtomFamily<T>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] => {
  return useAtom(atom, { ...option, place: { type: 'root' } });
};

export const useNamedRootAtom = <T>(rootName: string, atom: Atom<T> | AtomFamily<T>, option?: LimitedAtomOption<T>): [T, AtomSetterOrUpdater<T>] => {
  return useAtom(atom, { ...option, place: { type: 'named', name: rootName } });
};
