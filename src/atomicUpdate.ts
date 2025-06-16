import { createAtomicContext, createAtomicOperations, AtomicContext } from './atomicContext';
import { DependencyState, DependentState, Cell, State } from './state';

type AtomicUpdateOps = {
  get: <T>(state: DependencyState<T>) => T;
  set: <T>(cell: Cell<T>, value: T) => void;
  touch: <T>(state: State<T>) => void;
  dispose: <T extends Disposable>(target: T) => void;
  pending: <T>(state: State<T>, promise?: Promise<any>) => void;
  rejectAllChanges: () => void;
  context: AtomicContext;
};

export function atomicUpdate<T>(fn: (ops: AtomicUpdateOps) => T, options?: { context?: AtomicContext }): T;
export function atomicUpdate<T>(fn: (ops: AtomicUpdateOps) => Promise<T>, options?: { context?: AtomicContext }): Promise<T>;
export function atomicUpdate<T>(fn: (ops: AtomicUpdateOps) => T | Promise<T>, options?: { context?: AtomicContext }): T | Promise<T> {
  const shouldCommit = !options?.context;
  const context = options?.context || createAtomicContext();
  const baseOps = createAtomicOperations(context);
  const ops: AtomicUpdateOps = {
    ...baseOps,
    context
  };
  
  const result = fn(ops);
  
  if (result instanceof Promise) {
    context.atomicUpdatePromise = result;
    return result.then(
      (value) => {
        if (shouldCommit) {
          context.commit();
        }
        return value;
      }
    );
  }
  
  if (shouldCommit) {
    context.commit();
  }
  return result;
}