import { useContext } from 'react';
import { Atom, AtomFamily, AtomInstance, getAtomInstance } from '../atom';
import { FiddichStoreContext, FiddichState, FiddichStateInstance } from '../core';
import { getSelectorInstance, Selector, SelectorFamily, SelectorInstance } from '../selector';

const noStoreErrorText = 'Component is not inside the FiddichRoot/SubFiddichRoot.';

export const useAtomInstance = <T, P>(atom: Atom<T> | AtomFamily<T, P>, forceNearest: boolean, initialValue?: T): AtomInstance<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const instanceInfo = getAtomInstance(atom, store, forceNearest, initialValue);
  return instanceInfo.instance;
};

export const useSelectorInstance = <T>(selector: Selector<T> | SelectorFamily<T, any>, forceNearest: boolean): SelectorInstance<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const instanceInfo = getSelectorInstance(selector, store, forceNearest);

  return instanceInfo.instance;
};

export function useInstance<T>(state: Atom<T> | AtomFamily<T>, forceNearest: boolean, initialValue?: T): AtomInstance<T>;
export function useInstance<T>(state: Selector<T> | SelectorFamily<T, any>, forceNearest: boolean): SelectorInstance<T>;
export function useInstance<T>(state: FiddichState<T>, forceNearest: boolean, initialValue?: T): FiddichStateInstance<T>;
export function useInstance<T>(state: FiddichState<T>, forceNearest: boolean, initialValue?: T): FiddichStateInstance<T> {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return useAtomInstance(state, forceNearest, initialValue);
  } else {
    return useSelectorInstance(state, forceNearest);
  }
}
