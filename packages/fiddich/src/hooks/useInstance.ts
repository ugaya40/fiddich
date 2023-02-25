import { useContext } from 'react';
import { Atom, AtomFamily, AtomInstance, getAtomInstance } from '../atom';
import { FiddichStoreContext, FiddichState, FiddichStateInstance } from '../share';
import { getSelectorInstance, Selector, SelectorFamily, SelectorInstance } from '../selector';

const noStoreErrorText = 'Component is not inside the FiddichRoot/SubFiddichRoot.';

export type StorePlaceTypeHookContext =
  | {
      type: 'normal';
    }
  | {
      type: 'nearest';
    }
  | {
      type: 'root';
    }
  | {
      type: 'named';
      name: string;
    };

export const useAtomInstance = <T, P>(atom: Atom<T> | AtomFamily<T, P>, storePlace: StorePlaceTypeHookContext, initialValue?: T): AtomInstance<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const storePlaceType =
    storePlace.type === 'named'
      ? storePlace
      : {
          ...storePlace,
          nearestStore: store,
        };

  return getAtomInstance(atom, storePlaceType, initialValue);
};

const useSelectorInstance = <T>(selector: Selector<T> | SelectorFamily<T, any>, storePlace: StorePlaceTypeHookContext): SelectorInstance<T> => {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const storePlaceType =
    storePlace.type === 'named'
      ? storePlace
      : {
          ...storePlace,
          nearestStore: store,
        };

  return getSelectorInstance(selector, storePlaceType);
};

export function useInstance<T>(state: Atom<T> | AtomFamily<T>, storePlace: StorePlaceTypeHookContext, initialValue?: T): AtomInstance<T>;
export function useInstance<T>(state: Selector<T> | SelectorFamily<T, any>, storePlace: StorePlaceTypeHookContext): SelectorInstance<T>;
export function useInstance<T>(state: FiddichState<T>, storePlace: StorePlaceTypeHookContext, initialValue?: T): FiddichStateInstance<T>;
export function useInstance<T>(state: FiddichState<T>, storePlace: StorePlaceTypeHookContext, initialValue?: T): FiddichStateInstance<T> {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return useAtomInstance(state, storePlace, initialValue);
  } else {
    return useSelectorInstance(state, storePlace);
  }
}
