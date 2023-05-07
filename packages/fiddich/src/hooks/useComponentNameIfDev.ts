import React, { useMemo } from 'react';

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      renderers?: Map<
        any,
        {
          getCurrentFiber?: () => {
            type: any;
          };
        }
      >;
    };
  }
}

function getComponentNameIfDEV(): string | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined;

  if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED != null) {
    const result = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current?.type?.name;
    if (result != null) return result;
  }

  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers != null) {
    const renderersResult = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values?.().next?.();
    if (renderersResult != null && !renderersResult.done) {
      const result = renderersResult.value.getCurrentFiber?.()?.type?.name;
      if (result != null) return result;
    }
  }

  return undefined;
}

export const useComponentNameIfDev = () => {
  return useMemo(() => getComponentNameIfDEV(), []);
};
