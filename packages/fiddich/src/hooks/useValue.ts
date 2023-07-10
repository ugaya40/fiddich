import { useEffect } from 'react';
import { AsyncAtom, AsyncAtomFamily, AsyncAtomValueArg, Atom, AtomFamily, SyncAtom, SyncAtomFamily, SyncAtomValueArg } from '../atom/atom';
import type { FiddichState, FiddichStateInstance } from '../shareTypes';
import { AsyncSelector, AsyncSelectorFamily, Selector, SelectorFamily, SyncSelector, SyncSelectorFamily } from '../selector/selector';
import { StorePlaceTypeHookContext, useInstance } from './useInstance';
import { useRerender } from './useRerender';
import { defaultCompareFunction, invalidStatusErrorText } from '../util/const';
import { RequestRerenderReason, useValueInfoEventEmitter } from '../globalFiddichEvent';
import { useComponentNameIfDev } from './useComponentNameIfDev';

function returnValueForUseValue<T>(
  componentName: string | undefined,
  stateInstance: FiddichStateInstance<T>,
  suppressSuspenseWhenReset: boolean,
  suppressSuspenseWhenChange: boolean
) {
  if (stateInstance.status.type === 'stable') {
    useValueInfoEventEmitter.fireReturnValue(componentName, stateInstance, stateInstance.status.value);
    return stateInstance.status.value;
  } else if ('abortRequest' in stateInstance.status) {
    // Even if this state suppresses Suspense,
    // the waiting status may be exposed by a re-rendering by another StateInstance.value.
    // In that case, the old value should be returned.
    if (suppressSuspenseWhenChange && stateInstance.status.type === 'waiting') {
      if (stateInstance.status.isInitialized) {
        useValueInfoEventEmitter.fireReturnValue(componentName, stateInstance, stateInstance.status.oldValue);
        return stateInstance.status.oldValue;
      } else {
        useValueInfoEventEmitter.fireThrowPromise(componentName, stateInstance, stateInstance.status.promise);
        throw stateInstance.status.promise;
      }
    } else {
      // Only immediately after reset, there is a status of "waiting for initialize" in which "oldValue" is not undefined.
      if (suppressSuspenseWhenReset && stateInstance.status.type === 'waiting for initialize' && stateInstance.status.oldValue != null) {
        useValueInfoEventEmitter.fireReturnValue(componentName, stateInstance, stateInstance.status.oldValue);
        return stateInstance.status.oldValue;
      } else {
        useValueInfoEventEmitter.fireThrowPromise(componentName, stateInstance, stateInstance.status.promise);
        throw stateInstance.status.promise;
      }
    }
  } else if (stateInstance.status.type === 'error') {
    useValueInfoEventEmitter.fireThrowError(componentName, stateInstance, stateInstance.status.error);
    throw stateInstance.status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
}

export type SuppressSuspenseOption = {
  onReset?: boolean;
  onChange?: boolean;
};

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, suppressSuspenseWhenReset: boolean, suppressSuspenseWhenChange: boolean): T => {
  // Why not use useSyncExternalStore?
  //
  // The useSyncExternalStore has issues when combined with component-local useState in Concurrent Mode.
  // This behavior could potentially be disastrous in large applications.
  // Refer: https://github.com/remix-run/react-router/pull/10409
  //
  // As of May 5, 2023, useSyncExternalStore may also take multiple snapshots at unnecessary timings.
  // This can confuse developers who are using globalFiddichEvent to understand and control when components read data.
  //
  // Due to these reasons, at this point in time, we cannot adopt useSyncExternalStore.
  const rerenderPure = useRerender();
  const compare = stateInstance.state.compare ?? defaultCompareFunction;

  const componentName = useComponentNameIfDev();

  useEffect(() => {
    const rerender = (reason: RequestRerenderReason) => {
      rerenderPure();
      useValueInfoEventEmitter.fireRequestRerender(componentName, stateInstance, reason);
    };
    const listener = stateInstance.event.addListener(event => {
      if (event.type === 'change by promise' || event.type === 'change') {
        if (suppressSuspenseWhenChange && !compare(event.oldValue, event.newValue)) {
          rerender(event.type);
        }
      }

      if (event.type === 'waiting' || event.type === 'change') {
        if (!suppressSuspenseWhenChange) {
          rerender(event.type);
        }
      }

      if (event.type === 'reset' && !suppressSuspenseWhenReset) {
        rerender(event.type);
      }

      if (event.type === 'initialized' && suppressSuspenseWhenReset && event.oldValue != null) {
        rerender(event.type);
      }

      if (event.type === 'error') {
        rerender(event.type);
      }
    });

    return () => listener.dispose();
  }, [stateInstance.id, compare, suppressSuspenseWhenReset, suppressSuspenseWhenChange]);

  return returnValueForUseValue(componentName, stateInstance, suppressSuspenseWhenReset, suppressSuspenseWhenChange);
};

export type SyncSelectorValueOption = {
  place?: StorePlaceTypeHookContext;
};

export type AsyncSelectorValueOption = {
  suppressSuspense?: SuppressSuspenseOption;
  place?: StorePlaceTypeHookContext;
};

export type SelectorValueOption = SyncSelectorValueOption | AsyncSelectorValueOption;

export type SyncAtomValueOption<T> = {
  initialValue?: SyncAtomValueArg<T>;
  place?: StorePlaceTypeHookContext;
};

export type AsyncAtomValueOption<T> = {
  initialValue?: AsyncAtomValueArg<T>;
  suppressSuspense?: SuppressSuspenseOption;
  place?: StorePlaceTypeHookContext;
};

export type AtomValueOption<T> = SyncAtomValueOption<T> | AsyncAtomValueOption<T>;

export type LimitedSyncAtomValueOption<T> = Omit<SyncAtomValueOption<T>, 'place'>;
export type LimitedAsyncAtomValueOption<T> = Omit<AsyncAtomValueOption<T>, 'place'>;
export type LimitedAtomValueOption<T> = Omit<AtomValueOption<T>, 'place'>;

export type LimitedAsyncSelectorValueOption = Omit<AsyncSelectorValueOption, 'place'>;

export function useValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: AsyncAtomValueOption<T>): T;
export function useValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: SyncAtomValueOption<T>): T;
export function useValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: AtomValueOption<T>): T;
export function useValue<T>(state: AsyncSelector<T> | AsyncSelectorFamily<T, any>, option?: AsyncSelectorValueOption): T;
export function useValue<T>(state: SyncSelector<T> | SyncSelectorFamily<T, any>, option?: SyncSelectorValueOption): T;
export function useValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: SelectorValueOption): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T> | SelectorValueOption): T;
export function useValue<T>(state: FiddichState<T>, option?: AtomValueOption<T> | SelectorValueOption): T {
  if (option != null) {
    const suppressSuspenseWhenReset = 'suppressSuspense' in option ? option.suppressSuspense?.onReset ?? false : false;
    const suppressSuspenseWhenChange = 'suppressSuspense' in option ? option.suppressSuspense?.onChange ?? false : false;
    const initialValue = 'initialValue' in option ? option.initialValue : undefined;

    const instance = useInstance(state, option?.place ?? { type: 'normal' }, initialValue);
    return useValueInternal(instance, suppressSuspenseWhenReset, suppressSuspenseWhenChange);
  } else {
    const instance = useInstance(state, { type: 'normal' });
    return useValueInternal(instance, false, false);
  }
}

export function useHierarchicalValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useHierarchicalValue<T>(state: AsyncSelector<T> | AsyncSelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useHierarchicalValue<T>(state: SyncSelector<T> | SyncSelectorFamily<T, any>): T;
export function useHierarchicalValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T;
export function useHierarchicalValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T {
  const optionValue: AtomValueOption<T> | SelectorValueOption = { ...option, place: { type: 'hierarchical' } };
  return useValue(state, optionValue);
}

export function useRootValue<T>(state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useRootValue<T>(state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useRootValue<T>(state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useRootValue<T>(state: AsyncSelector<T> | AsyncSelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useRootValue<T>(state: SyncSelector<T> | SyncSelectorFamily<T, any>): T;
export function useRootValue<T>(state: Selector<T> | SelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T;
export function useRootValue<T>(state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T {
  const optionValue: AtomValueOption<T> | SelectorValueOption = { ...option, place: { type: 'root' } };
  return useValue(state, optionValue);
}

export function useNamedStoreValue<T>(storeName: string, state: AsyncAtom<T> | AsyncAtomFamily<T, any>, option?: LimitedAsyncAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: SyncAtom<T> | SyncAtomFamily<T, any>, option?: LimitedSyncAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: Atom<T> | AtomFamily<T, any>, option?: LimitedAtomValueOption<T>): T;
export function useNamedStoreValue<T>(storeName: string, state: AsyncSelector<T> | AsyncSelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useNamedStoreValue<T>(storeName: string, state: SyncSelector<T> | SyncSelectorFamily<T, any>): T;
export function useNamedStoreValue<T>(storeName: string, state: Selector<T> | SelectorFamily<T, any>, option?: LimitedAsyncSelectorValueOption): T;
export function useNamedStoreValue<T>(storeName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T;
export function useNamedStoreValue<T>(storeName: string, state: FiddichState<T>, option?: LimitedAtomValueOption<T> | LimitedAsyncSelectorValueOption): T {
  const optionValue: AtomValueOption<T> | SelectorValueOption = { ...option, place: { type: 'named', name: storeName } };
  return useValue(state, optionValue);
}
