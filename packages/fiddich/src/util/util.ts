import { useCallback, useState } from 'react';
import { Disposable } from './Disposable';

export const randomId = () => `${Math.round(Math.random() * 1e16)}`;

export function anonymousDisposable(disposeAction: () => void): Disposable {
  return {
    dispose: disposeAction,
  };
}

export function anonymousPromise<T>(func: () => T): Promise<T> {
  return new Promise<T>(resolve => {
    const result = func();
    resolve(result);
  });
}

export function useRerender() {
  const setFlg = useState(false)[1];
  return useCallback(() => {
    setFlg(old => !old);
  }, []);
}
