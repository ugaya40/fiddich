import type { ValueStates } from '../../state';
import { useValueInternal } from './useValueInternal';

export function useValue<T>(state: ValueStates<T>): T {
  const [_isPending, value] = useValueInternal(state, { suspense: true });
  return value;
}
