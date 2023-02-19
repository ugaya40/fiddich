import { useEffect, useRef } from 'react';
import { FiddichState, FiddichStateInstance } from '../core';
import { useInstance } from './useInstance';
import { useRerender } from './useRerender';

export const useValueInternal = <T>(stateInstance: FiddichStateInstance<T>, withTransition?: boolean): T => {
  const rerender = useRerender(withTransition);

  const pendingPromiseRef = useRef<Promise<T> | undefined>(undefined);

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (event.type === 'pending') {
        pendingPromiseRef.current = event.promise;
        console.log(`pending rerender - ${stateInstance.state.key}`);
        rerender();
      } else if (event.type === 'change') {
        if (event.promise != null && event.promise === pendingPromiseRef.current) return;
        console.log(`change rerender - ${stateInstance.state.key}`);
        rerender();
      }
    });

    return () => listener.dispose();
  }, [stateInstance.storeId]);

  if (stateInstance.status.type === 'pending') {
    throw stateInstance.status.promise!;
  } else {
    return stateInstance.status.value;
  }
};

export const useValue = <T>(
  state: FiddichState<T>,
  option?: {
    initialValue?: T;
    withTransition?: boolean;
  }
): T => {
  const instance = useInstance(state, false, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
};

export const useNearestValue = <T>(
  state: FiddichState<T>,
  option?: {
    initialValue?: T;
    withTransition?: boolean;
  }
): T => {
  const instance = useInstance(state, true, option?.initialValue);
  return useValueInternal(instance, option?.withTransition);
};
