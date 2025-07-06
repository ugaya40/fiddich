import type { State } from './state';
import { compute } from './compute';
import { isComputed } from './stateUtil/typeUtil';
import { DisposedStateError } from './errors';

export function get<T>(state: State<T>): T {
  if(state.isDisposed) {
    throw new DisposedStateError();
  }

  if(isComputed(state) && state.isDirty) {
    compute(state);
  }

  return state.stableValue;
}
