import type { ValueStates } from '../../types';
import { useValueInternal } from './useValueInternal';

export function useValueStatus<T>(state: ValueStates<T>): [isPending: boolean, value: T] {
  return useValueInternal(state, { suspense: false });
}
