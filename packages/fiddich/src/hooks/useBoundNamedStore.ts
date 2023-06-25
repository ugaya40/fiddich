import { useMemo } from 'react';
import { createNewNamedStore, deleteNamedStoreIfExists } from '../namedStore';
import { useLifecycleEffect } from './useLifecycleEffect';

export function useBoundNamedStore(storeName: string) {
  useMemo(() => createNewNamedStore(storeName), []);
  useLifecycleEffect({ cleanup: () => deleteNamedStoreIfExists(storeName) });
}
