import { createNewNamedStore, deleteNamedStoreIfExists } from '../namedStore';
import { useLifecycleEffect } from './useLifecycleEffect';

export function useBoundNamedStore(storeName: string) {
  useLifecycleEffect({
    beforeInit: () => createNewNamedStore(storeName),
    cleanup: () => deleteNamedStoreIfExists(storeName),
  });
}
