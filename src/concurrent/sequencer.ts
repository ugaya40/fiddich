import type { AtomicOperations } from '../atomicUpdate';
import type { ConcurrentActions, ConcurrentToken } from './types';

const maps = new WeakMap<SequencerToken, SequencerInfo>();

export interface SequencerToken extends ConcurrentToken {
  type: 'sequencer';
}

type QueueItem = {
  resolve: () => void;
};

type SequencerInfo = {
  isRunning: boolean;
  queue: QueueItem[];
};

export function createSequencerToken(): SequencerToken {
  const token: SequencerToken = { type: 'sequencer' };
  maps.set(token, { isRunning: false, queue: [] });
  return token;
}

export function createSequencerActions(token: SequencerToken): ConcurrentActions {
  const info = maps.get(token)!;

  const wrapFunction = <T>(fn: (ops: AtomicOperations) => T | Promise<T>) => {
    return async (ops: any) => {
      await new Promise<void>((resolve) => {
        if (!info.isRunning) {
          info.isRunning = true;
          resolve();
        } else {
          info.queue.push({ resolve });
        }
      });

      return fn(ops);
    };
  };

  const afterCommit = () => {
    const next = info.queue.shift();
    if (next) {
      next.resolve();
    } else {
      info.isRunning = false;
    }
  };

  const afterFailure = () => {
    const next = info.queue.shift();
    if (next) {
      next.resolve();
    } else {
      info.isRunning = false;
    }
  };

  return {
    wrapFunction,
    afterCommit,
    afterFailure,
  };
}
