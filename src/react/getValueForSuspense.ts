import { get } from '../get';
import type { ValueStates } from '../types';

export function getValueForSuspense<T>(state: ValueStates<T>): T {
  if (state.pendingPromise != null) {
    throw state.pendingPromise;
  }

  return get(state);
}
