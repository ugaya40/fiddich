import { initializeAsyncSelector, initializeSyncSelector } from './initialize';
import { AsyncSelectorInstance, SelectorInstance, SyncSelectorInstance } from './selector';

export const resetSelector = <T>(selectorInstance: SelectorInstance<T>) => {
  if ('default' in selectorInstance.state) {
    const syncSelectorInstance = selectorInstance as SyncSelectorInstance<T>;
    initializeSyncSelector(syncSelectorInstance);
  } else {
    const asyncSelectorInstance = selectorInstance as AsyncSelectorInstance<T>;
    initializeAsyncSelector(asyncSelectorInstance);
  }
  selectorInstance.event.emit({ type: 'reset' });
};
