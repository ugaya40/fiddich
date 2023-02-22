import { useEffect, useRef } from 'react';
import { FiddichState, FiddichStateInstance } from '../core';
import { useInstance } from './useInstance';
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
