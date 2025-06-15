import { createAtomicContext, createAtomicOperations } from './atomicContext';
import { DependencyState, DependentState, Cell, State } from './state';

type AtomicUpdateOps = {
  get: <T>(state: DependencyState<T>) => T;
  set: <T>(cell: Cell<T>, value: T) => void;
  touch: <T>(state: DependentState<T>) => void;
  dispose: <T>(state: State<T>) => void;
  pending: () => DependentState[];
};

export function atomicUpdate<T>(fn: (ops: AtomicUpdateOps) => T): T {
  const context = createAtomicContext();
  const ops = createAtomicOperations(context);
  
  try {
    const result = fn(ops);
    context.commit();
    return result;
  } catch (error) {
    // Rollback is automatic - we simply discard the context
    throw error;
  }
}