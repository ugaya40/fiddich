import { useCallback } from 'react';
import { Atom, AtomFamily, AtomInstance, changeAtomValue, AtomSetterOrUpdater, AtomSetterOrUpdaterArg, AtomFamilySetterOrUpdater } from '../atom';
import { StorePlaceTypeHookContext, useAtomInstance } from './useInstance';

export const useSetAtomInternal = <T, P>(atomInstance: AtomInstance<T>): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> => {
  const setFunc = useCallback(
    (valueOrUpdater: AtomSetterOrUpdaterArg<T>) => {
      changeAtomValue(atomInstance, valueOrUpdater);
    },
    [atomInstance.storeId]
  );

  return setFunc;
};

type SetAtomOption<T> = {
  initialValue?: T;
  place?: StorePlaceTypeHookContext;
};

export function useSetAtom<T>(atom: Atom<T>, option?: SetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetAtom<T, P>(atom: AtomFamily<T, P>, option?: SetAtomOption<T>): AtomFamilySetterOrUpdater<T, P>;
export function useSetAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, option?: SetAtomOption<T>): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetAtom<T, P>(atom: Atom<T> | AtomFamily<T, P>, option?: SetAtomOption<T>): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, option?.place ?? { type: 'normal' }, option?.initialValue);
  return useSetAtomInternal(atomInstance);
}

type LimitedSetAtomOption<T> = Omit<SetAtomOption<T>, 'place'>;

export function useSetNearestAtom<T>(atom: Atom<T>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetNearestAtom<T, P>(atom: AtomFamily<T, P>, option?: LimitedSetAtomOption<T>): AtomFamilySetterOrUpdater<T, P>;
export function useSetNearestAtom<T, P>(
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetNearestAtom<T, P>(
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, { type: 'nearest' }, option?.initialValue);
  return useSetAtomInternal(atomInstance);
}

export function useSetRootAtom<T>(atom: Atom<T>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetRootAtom<T, P>(atom: AtomFamily<T, P>, option?: LimitedSetAtomOption<T>): AtomFamilySetterOrUpdater<T, P>;
export function useSetRootAtom<T, P>(
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetRootAtom<T, P>(
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, { type: 'root' }, option?.initialValue);
  return useSetAtomInternal(atomInstance);
}

export function useSetNamedAtom<T>(rootName: string, atom: Atom<T>, option?: LimitedSetAtomOption<T>): AtomSetterOrUpdater<T>;
export function useSetNamedAtom<T, P>(rootName: string, atom: AtomFamily<T, P>, option?: LimitedSetAtomOption<T>): AtomFamilySetterOrUpdater<T, P>;
export function useSetNamedAtom<T, P>(
  rootName: string,
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P>;
export function useSetNamedAtom<T, P>(
  rootName: string,
  atom: Atom<T> | AtomFamily<T, P>,
  option?: LimitedSetAtomOption<T>
): AtomSetterOrUpdater<T> | AtomFamilySetterOrUpdater<T, P> {
  const atomInstance = useAtomInstance(atom, { type: 'named', name: rootName }, option?.initialValue);
  return useSetAtomInternal(atomInstance);
}
