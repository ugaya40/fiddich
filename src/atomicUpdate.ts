import { AtomicContext } from "./atomicContext";
import { Cell, Computed, DependencyState } from "./state";

interface AtomicOperations {
  get<T>(target: DependencyState<T>): T;
  set<T>(target: Cell<T>, value: T): void;
  pending<T>(target: DependencyState<T> ): void;
  rejectAllChanges(): void;
  touch<T>(target: DependencyState<T>): void;
  dispose<T extends { [Symbol.dispose](): void }>(target: T): void;
  readonly context: AtomicContext;
}

interface AtomicUpdateOptions {
  context?: AtomicContext;
}

export async function atomicUpdate( 
  fn: (ops: AtomicOperations) => Promise<void>,
  options?: AtomicUpdateOptions
): Promise<void> {
  const opsGet = <T>(target: DependencyState<T>) => {

  };
}