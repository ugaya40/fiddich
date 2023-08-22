import { useEffect, useRef } from 'react';

export function useChangedValue<T>(
  value: T,
  option: {
    init?: (current: T) => void;
    effect?: (current: T, old: T) => void;
    cleanup?: (current: T) => void;
  }
) {
  const valueRef = useRef<T>(value);
  if (value !== valueRef.current) {
    const oldValue = valueRef.current;
    valueRef.current = value;
    option.effect?.(value, oldValue);
  }

  useEffect(() => {
    option.init?.(value);
    return () => option.cleanup?.(valueRef.current);
  }, []);
}
