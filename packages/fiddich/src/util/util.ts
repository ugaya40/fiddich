import React from 'react';
import { isDEV } from './const';

function generateRandomString(length: number): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  window.crypto.getRandomValues(array);
  const hexArray = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2));
  const hexString = hexArray.join('');
  const truncatedHexString = hexString.slice(0, length);
  return truncatedHexString;
}

export const generateRandomKey = () => generateRandomString(16);

export function lazyFunction<TFunc extends (...args: any[]) => any>(func: () => TFunc): TFunc {
  let result: TFunc | undefined;
  return ((...args: any[]) => {
    if (result == null) {
      result = func();
    }
    return result(...args);
  }) as TFunc;
}

export function getComponentNameIfDEV(): string | undefined {
  if (!isDEV) {
    return undefined;
  } else if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers != null) {
    const base = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.values().next().value;
    return base?.getCurrentFiber?.()?.type?.name as string;
  } else if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    const result = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current?.type?.name;
    return result;
  }
}
