import {
  AsyncAtomFamilyValueArg,
  AsyncAtomInstance,
  AsyncAtomValueArg,
  AtomInstance,
  SyncAtomFamilyValueArg,
  SyncAtomInstance,
  SyncAtomValueArg,
} from './atom';
import { initializeAsyncAtom, initializeSyncAtom } from './initialize';

export const resetAtom = <T>(
  atomInstance: AtomInstance<T>,
  initialValue?: SyncAtomValueArg<T> | AsyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any> | AsyncAtomFamilyValueArg<T, any>
) => {
  if ('default' in atomInstance.state) {
    const syncAtomInstance = atomInstance as SyncAtomInstance<T>;
    initializeSyncAtom(syncAtomInstance, initialValue as SyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any>);
  } else {
    const asyncAtomInstance = atomInstance as AsyncAtomInstance<T>;
    initializeAsyncAtom(asyncAtomInstance, initialValue as AsyncAtomValueArg<T> | AsyncAtomFamilyValueArg<T, any>);
  }

  atomInstance.event.emit({ type: 'reset' });
};
