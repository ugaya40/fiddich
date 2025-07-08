import { get } from '../get';
import type { State } from '../state';

export function getValueForSuspense<T>(state: State<T>): T {
  if (state.pendingPromise != null) {
    throw state.pendingPromise;
  }

  return get(state);
}
