import { createAtomicContext, createAtomicOperations, AtomicContext } from './atomicContext';
import { DependencyState, DependentState, Cell, State } from './state';

type AtomicUpdateOps = {
  get: <T>(state: DependencyState<T>) => T;
  set: <T>(cell: Cell<T>, value: T) => void;
  touch: <T>(state: DependentState<T>) => void;
  dispose: <T>(state: State<T>) => void;
  pending: () => DependentState[];
  context: AtomicContext;
};

export async function atomicUpdateAsync<T>(fn: (ops: AtomicUpdateOps) => Promise<T>, options?: { context?: AtomicContext }): Promise<T> {
  const shouldCommit = !options?.context;
  const context = options?.context || createAtomicContext();
  const baseOps = createAtomicOperations(context);
  const ops: AtomicUpdateOps = {
    ...baseOps,
    context
  };
  
  try {
    const result = await fn(ops);
    // Only commit if we created our own context
    if (shouldCommit) {
      context.commit();
    }
    return result;
  } catch (error) {
    // Rollback is automatic - we simply discard the context
    throw error;
  }
}