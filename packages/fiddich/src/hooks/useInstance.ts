import { useContext } from 'react';
import { AsyncAtomValueArg, Atom, AtomFamily, AtomInstance, getOrAddAsyncAtomInstance, getOrAddSyncAtomInstance, SyncAtomValueArg } from '../atom';
import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { getOrAddAsyncSelectorInstance, getOrAddSyncSelectorInstance, Selector, SelectorFamily, SelectorInstance } from '../selector';
import { FiddichStoreContext, noStoreErrorText } from '../util/const';

export type StorePlaceTypeHookContext =
  | {
      type: 'normal';
    }
  | {
      type: 'hierarchical';
    }
  | {
      type: 'root';
    }
  | {
      type: 'named';
      name: string;
    }
  | {
      type: 'context';
      key: string;
    };

type UseAtomInstanceArgsType<T, P> = {
  atom: Atom<T> | AtomFamily<T, P, any>;
  storePlace: StorePlaceTypeHookContext;
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>;
};

export function useAtomInstance<T, P>(arg: UseAtomInstanceArgsType<T, P>): AtomInstance<T> {
  const store = useContext(FiddichStoreContext);
  if (store == null) throw new Error(noStoreErrorText);

  const storePlaceType =
    arg.storePlace.type === 'named'
      ? arg.storePlace
      : {
          ...arg.storePlace,
          nearestStore: store,
        };

  return 'default' in arg.atom
    ? getOrAddSyncAtomInstance(arg.atom, storePlaceType, arg.initialValue as SyncAtomValueArg<T>)
    : getOrAddAsyncAtomInstance(arg.atom, storePlaceType, arg.initialValue as AsyncAtomValueArg<T>);
}

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

  return 'get' in selector ? getOrAddSyncSelectorInstance(selector, storePlaceType) : getOrAddAsyncSelectorInstance(selector, storePlaceType);
};

export function useInstance<T>(
  state: Atom<T> | AtomFamily<T>,
  storePlace: StorePlaceTypeHookContext,
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>
): AtomInstance<T>;
export function useInstance<T>(state: Selector<T> | SelectorFamily<T, any>, storePlace: StorePlaceTypeHookContext): SelectorInstance<T>;
export function useInstance<T>(
  state: FiddichState<T>,
  storePlace: StorePlaceTypeHookContext,
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>
): FiddichStateInstance<T>;
export function useInstance<T>(
  state: FiddichState<T>,
  storePlace: StorePlaceTypeHookContext,
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T>
): FiddichStateInstance<T> {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return useAtomInstance({ atom: state, storePlace, initialValue });
  } else {
    return useSelectorInstance(state, storePlace);
  }
}
