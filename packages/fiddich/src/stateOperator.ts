import { getAtomInstance } from './atom';
import { FiddichState, FiddichStateInstance, Store } from './core';
import { getSelectorInstance } from './selector';

export const getStateInstance = <T = unknown>(state: FiddichState<T>, nearestStore: Store): { instance: FiddichStateInstance<T>; storeTree: Store[] } => {
  if (state.type === 'atom' || state.type === 'atomFamily') {
    return getAtomInstance(state, nearestStore);
  } else {
    return getSelectorInstance(state, nearestStore);
  }
};
