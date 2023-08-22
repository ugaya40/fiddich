import { AtomInstance } from '../atom/atom';
import { resetAtom } from '../atom/reset';
import { resetSelector } from '../selector/reset';
import { SelectorInstance } from '../selector/selector';
import { FiddichStateInstance, Store } from '../shareTypes';

export function resetStoreStates(store: Store) {
  store.map.forEach(resetState);
}

export function resetState(stateInstance: FiddichStateInstance) {
  if (stateInstance.state.type === 'atom' || stateInstance.state.type === 'atomFamily') {
    resetAtom(stateInstance as AtomInstance<unknown>);
  } else {
    resetSelector(stateInstance as SelectorInstance<unknown>);
  }
}
