import type { State } from '../../state';
import { useValueInternal } from './useValueInternal';

export function useValue<T>(state: State<T>): T {
  const [_isPending, value] = useValueInternal(state, { suspense: true });
  return value;
}
