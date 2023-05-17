import { AtomInstance } from '../atom/atom';
import { resetAtom } from '../atom/reset';
import { resetSelector } from '../selector/reset';
import { SelectorInstance } from '../selector/selector';
import { FiddichStateInstance, Store } from '../shareTypes';

function resetStoreStatesInternal(store: Store, doneList: Store[], recursive: boolean) {
  store.map.forEach(resetState);
  doneList.push(store);
  if (recursive) {
    store.children.forEach(child => resetStoreStatesInternal(child, doneList, recursive));
  }
}

export function resetStoreStates(store: Store, recursive: boolean) {
  if (recursive) {
    const doneList: Store[] = [];
    resetStoreStatesInternal(store, doneList, true);
  } else {
    resetStoreStatesInternal(store, [], false);
  }
}

export function resetState(stateInstance: FiddichStateInstance) {
  if (stateInstance.state.type === 'atom' || stateInstance.state.type === 'atomFamily') {
    resetAtom(stateInstance as AtomInstance<unknown>);
  } else {
    resetSelector(stateInstance as SelectorInstance<unknown>);
  }
}
