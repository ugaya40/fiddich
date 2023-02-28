import { useEffect } from 'react';
import { Atom, AtomFamily } from '../atom';
import { FiddichState, FiddichStateInstance } from '../share';
import { Selector, SelectorFamily } from '../selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useRerender } from './useRerender';

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, noSuspense?: boolean): T => {
  const rerender = useRerender();

  const compare = stateInstance.state.compare ?? ((old: T | undefined, current: T) => old === current);

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (!noSuspense) {
        if (event.type === 'pending' || event.type === 'pending for source' || event.type === 'change') {
          rerender();
        }
      } else {
        if (event.type === 'change by promise' || event.type === 'change') {
          if (!compare(event.oldValue, event.newValue)) {
            rerender();
          }
        }
      }
    });

    return () => listener.dispose();
  }, [stateInstance, stateInstance.storeId]);

  if (stateInstance.status.type === 'stable') {
    return stateInstance.status.value;
  } else {
    throw stateInstance.status.promise;
  }
};

export type SelectorValueOption = {
  noSuspense?: boolean;
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
  return useValueInternal(instance, option?.noSuspense);
}

export function useHierarchicalValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'hierarchical' }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}

export function useRootValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'root' }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}

export function useNamedRootValue<T>(rootName: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedSelectorValueOption): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T;
export function useNamedRootValue<T>(rootName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T>): T {
  const instance = useInstance(state, { type: 'named', name: rootName }, option?.initialValue);
  return useValueInternal(instance, option?.noSuspense);
}
