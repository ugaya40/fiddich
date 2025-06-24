import type { ConcurrentActions, ConcurrentToken } from './types';

const maps = new WeakMap<ExclusiveToken, ExclusiveInfo>();

export interface ExclusiveToken extends ConcurrentToken {
  type: 'exclusive';
}

type ExclusiveInfo = {
  isRunning: boolean;
};

export function createExclusiveToken(): ExclusiveToken {
  const token: ExclusiveToken = { type: 'exclusive' };
  maps.set(token, { isRunning: false });
  return token;
}

export function createExclusiveActions(token: ExclusiveToken): ConcurrentActions {
  const info = maps.get(token)!;

  const beforeRun = () => {
    if (info.isRunning) {
      return `Concurrent operation failed: conflict`;
    } else {
      info.isRunning = true;
      return true;
    }
  };
  const afterCommit = () => {
    info.isRunning = false;
  };
  const afterFailure = () => {
    info.isRunning = false;
  };

  return {
    beforeRun,
    afterCommit,
    afterFailure,
  };
}
