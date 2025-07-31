import { compute } from './compute';
import { DisposedStateError } from './errors';
import { isComputed } from './stateUtil/typeUtil';
import type { ValueStates } from './types';

export function get<T>(state: ValueStates<T>): T {
  if (state.isDisposed) {
    throw new DisposedStateError();
  }

  if (isComputed(state) && state.isDirty) {
    compute(state);
  }

  return state.stableValue;
}
