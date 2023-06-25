import { DependencyList, useEffect } from 'react';

export function useLifecycleEffect(
  option: {
    init?: () => void;
    effect?: () => void;
    cleanup?: () => void;
  },
  deps?: DependencyList
) {
  useEffect(() => {
    option.init?.();
    return () => option.cleanup?.();
  }, []);
  useEffect(() => {
    option.effect?.();
  }, deps);
}
