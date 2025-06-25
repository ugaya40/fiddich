import { AtomicOperations } from "../atomicUpdate";

export type ConcurrentToken = {
  type: string;
};

export type ConcurrentActions = {
  beforeRun?: () => true | string;
  wrapFunction?: <T>(fn: (ops: AtomicOperations) => T | Promise<T>) => (ops: any) => T | Promise<T>;
  afterRun?: () => true | string;
  beforeCommit?: () => void;
  afterCommit?: () => void;
  afterFailure?: () => void;
};
