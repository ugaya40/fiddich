import type { AtomicContext } from '../atomicContext';
import type { AtomicOperations } from '../atomicUpdate';

export type ConcurrentToken = {
  type: string;
};

export type ConcurrentActions = {
  beforeRun?: () => true | string;
  wrapFunction?: <T>(fn: (ops: AtomicOperations) => T | Promise<T>) => (ops: any) => T | Promise<T>;
  afterRun?: (context: AtomicContext) => true | string;
  beforeCommit?: (context: AtomicContext) => void;
  afterCommit?: (context: AtomicContext) => void;
  afterFailure?: (context: AtomicContext) => void;
};
