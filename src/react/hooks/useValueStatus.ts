import type { State } from '../../state';
import { useValueInternal } from './useValueInternal';

export function useValueStatus<T>(state: State<T>): [isPending: boolean, value: T] {
  return useValueInternal(state, { suspense: false });
}
