import { useEffect } from 'react';
import { Atom, AtomFamily } from '../atom';
import { FiddichState, FiddichStateInstance } from '../share';
import { Selector, SelectorFamily } from '../selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useRerender } from './useRerender';

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, withTransition?: boolean): T => {
  const rerender = useRerender(withTransition);

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (event.type === 'pending' || event.type === 'pending for source' || event.type === 'change') {
        rerender();
      }
    });

    return () => listener.dispose();
  }, [stateInstance.storeId]);

  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else {
    throw stateInstance.status.promise;
  }
};

export type SelectorValueOption = {
  withTransition?: boolean;
  place?: StorePlaceTypeHookContext;
};

export type AtomValueOption<T> = SelectorValueOption & {
  initialValue?: T;
};

export type LimitedSelectorValueOption = Omit<SelectorValueOption, 'place'>;
export type LimitedAtomValueOption<T> = Omit<AtomValueOption<T>, 'place'>;

export function useValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: AtomValueOption<T>): T;
export function useValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: SelectorValueOption): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T>): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T>): T {
  const instance = useInstance(state, option?.place ?? { type: 'normal' }, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
}

export function useNearestValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNearestValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useNearestValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useNearestValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'nearest' }, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
}

export function useRootValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'root' }, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
}

export function useNamedRootValue<T>(rootName: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'named', name: rootName }, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
}
