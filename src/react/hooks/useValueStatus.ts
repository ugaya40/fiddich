import type { ValueStates } from '../../state';
import { useValueInternal } from './useValueInternal';

export function useValueStatus<T>(state: ValueStates<T>): [isPending: boolean, value: T] {
  return useValueInternal(state, { suspense: false });
}
