import { startTransition, useCallback, useState } from 'react';
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

export function useRerender(withTransition?: true) {
  const setFlg = useState(0)[1];
  return useCallback(() => {
    withTransition ? startTransition(() => setFlg(old => old + 1)) : setFlg(old => old + 1);
  }, []);
}
