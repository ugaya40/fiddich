import { DependencyList, useEffect, useMemo } from 'react';

export function useLifecycleEffect(
  option: {
    beforeInit?: () => void;
    init?: () => void;
    effect?: () => void;
    cleanup?: () => void;
  },
  deps?: DependencyList
) {
  useMemo(() => option.beforeInit?.(), []);
  useEffect(() => {
    option.init?.();
    return () => option.cleanup?.();
  }, []);
  useEffect(() => {
    option.effect?.();
  }, deps);
}
