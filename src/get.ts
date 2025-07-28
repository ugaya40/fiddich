import { compute } from './compute';
import { DisposedStateError } from './errors';
import type { ValueStates } from './state';
import { isComputed } from './stateUtil/typeUtil';

export function get<T>(state: ValueStates<T>): T {
  if (state.isDisposed) {
    throw new DisposedStateError();
  }

  if (isComputed(state) && state.isDirty) {
    compute(state);
  }

  return state.stableValue;
}
