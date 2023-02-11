import { useEffect } from 'react';
import { FiddichState, FiddichStateInstance } from '../core';
import { useRerender } from '../util/util';
import { useInstance } from './useInstance';

export const useFiddichValueInternal = <T>(stateInstance: FiddichStateInstance<T>): T => {
  const rerender = useRerender();

  useEffect(() => {
    const listener = stateInstance.event.addListener(event => {
      if (event.type === 'change') {
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

export const useFiddichValue = <T>(state: FiddichState<T>, initialValue?: T): T => {
  const instance = useInstance(state, initialValue);
  return useFiddichValueInternal(instance);
};
