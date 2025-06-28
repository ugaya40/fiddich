import type { AtomicContext } from '../atomicContext';
import type { ConcurrentActions, ConcurrentToken } from './types';

const maps = new WeakMap<GuardToken, GuardInfo>();

export interface GuardToken extends ConcurrentToken {
  type: 'guard';
}

type GuardInfo = {
  revision: number;
};

export function createGuardToken(): GuardToken {
  const token: GuardToken = { type: 'guard' };
  maps.set(token, { revision: 0 });
  return token;
}

export function createGuardActions(token: GuardToken): ConcurrentActions {
  const info = maps.get(token)!;

  let currentRevision: number;
  let isReadOnly = false;

  const beforeRun: ConcurrentActions['beforeRun'] = () => {
    currentRevision = info.revision;
    return true;
  };

  const afterRun = (context: AtomicContext) => {
    // Check if this is a read-only operation
    isReadOnly = context.valueChangedDirty.size === 0;
    
    // Skip conflict check for read-only operations
    if (isReadOnly) {
      return true;
    }
    
    if (currentRevision !== info.revision) {
      return `Concurrent operation failed: conflict`;
    } else {
      return true;
    }
  };

  const afterCommit = () => {
    // Only increment revision for write operations
    if (!isReadOnly) {
      info.revision++;
    }
  };

  return {
    beforeRun,
    afterRun,
    afterCommit,
  };
}
