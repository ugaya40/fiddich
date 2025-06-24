import { type AtomicContext, createAtomicContext, createAtomicOperations } from './atomicContext';
import { commit } from './atomicContext/commit';
import { getConcurrentActions } from './concurrent';
import type { ExclusiveToken } from './concurrent/exclusive';
import type { GuardToken } from './concurrent/guard';
import type { SequencerToken } from './concurrent/sequencer';
import type { Cell, State } from './state';

type AtomicOperations = {
  get: <T>(state: State<T>) => T;
  set: <T>(cell: Cell<T>, value: T) => void;
  touch: <T>(state: State<T>) => void;
  dispose: <T extends Disposable>(target: T) => void;
  pending: (state: State, promise?: Promise<any>) => void;
  rejectAllChanges: () => void;
  context: AtomicContext;
};

type AtomicUpdateInternalOptions = {
  context?: AtomicContext;
  concurrent?: GuardToken | ExclusiveToken | SequencerToken;
};

export type AtomicSuccess<T> = { ok: true; value: T };
export type AtomicReject = { ok: false; reason: string };

export type AtomicUpdateResult<T> = AtomicSuccess<T> | AtomicReject;

function atomicUpdateInternal<T>(
  fn: (ops: AtomicOperations) => T | Promise<T>,
  options?: AtomicUpdateInternalOptions
): AtomicUpdateResult<T> | Promise<AtomicUpdateResult<T>> {
  const concurrentAction = getConcurrentActions(options?.concurrent);

  //beforeRun
  const beforeRunResult = concurrentAction?.beforeRun?.();
  if (beforeRunResult != null && typeof beforeRunResult === 'string') {
    return { ok: false, reason: beforeRunResult } as AtomicReject;
  }

  const isContextOwner = !options?.context;
  const atomicContext = options?.context || createAtomicContext();

  const baseOps = createAtomicOperations(atomicContext);
  const ops: AtomicOperations = {
    ...baseOps,
    context: atomicContext,
  };

  let clearPendingIfOwner: () => void = () => {};
  if (!atomicContext.atomicUpdatePromise) {
    atomicContext.atomicUpdatePromise = new Promise((resolve) => {
      clearPendingIfOwner = () => {
        if (isContextOwner) {
          resolve(undefined);
        }
      };
    });
  }

  //wrapFunction
  const newFunction = concurrentAction?.wrapFunction != null ? concurrentAction.wrapFunction(fn) : fn;

  let result: T | Promise<T>;
  try {
    result = newFunction(ops);
  } catch (error) {
    //afterFailure
    concurrentAction?.afterFailure?.();
    clearPendingIfOwner();

    throw error;
  }

  if (result instanceof Promise) {
    return result
      .then((value) => {
        //afterRun
        const afterRunResult = concurrentAction?.afterRun?.();
        if (afterRunResult != null && typeof afterRunResult === 'string') {
          return { ok: false, reason: afterRunResult } as AtomicReject;
        }

        if (isContextOwner) {
          commit(atomicContext);
          //afterCommit
          concurrentAction?.afterCommit?.();
        }
        clearPendingIfOwner();
        return { ok: true, value } as AtomicSuccess<T>;
      })
      .catch((error) => {
        //afterFailure
        concurrentAction?.afterFailure?.();

        clearPendingIfOwner();
        throw error;
      });
  } else {
    //afterRun
    const afterRunResult = concurrentAction?.afterRun?.();
    if (afterRunResult != null && typeof afterRunResult === 'string') {
      return { ok: false, reason: afterRunResult };
    }

    if (isContextOwner) {
      commit(atomicContext);

      //afterCommit
      concurrentAction?.afterCommit?.();
    }
    clearPendingIfOwner();
    return { ok: true, value: result } as AtomicSuccess<T>;
  }
}

export type SyncAtomicUpdateOptions = {
  context?: AtomicContext;
};

export type AsyncAtomicUpdateOptions = {
  context?: AtomicContext;
  concurrent?: SequencerToken;
};

export type AtomicUpdateOptions = SyncAtomicUpdateOptions | AsyncAtomicUpdateOptions;

export function atomicUpdate<T>(fn: (ops: AtomicOperations) => Promise<T>, options?: AsyncAtomicUpdateOptions): Promise<T>;
export function atomicUpdate<T>(fn: (ops: AtomicOperations) => T, options?: SyncAtomicUpdateOptions): T;
export function atomicUpdate<T>(fn: (ops: AtomicOperations) => T | Promise<T>, options?: AtomicUpdateOptions): T | Promise<T>;
export function atomicUpdate<T>(fn: (ops: AtomicOperations) => T | Promise<T>, options?: AtomicUpdateOptions): T | Promise<T> {
  const result = atomicUpdateInternal(fn, options);
  if (result instanceof Promise) {
    return result.then((r) => {
      if (r.ok) {
        return r.value;
      } else {
        throw new Error('internal error');
      }
    });
  } else {
    if (result.ok) {
      return result.value;
    } else {
      throw new Error('internal error');
    }
  }
}

export type TryAtomicUpdateOptions = {
  context?: AtomicContext;
  concurrent?: GuardToken | ExclusiveToken;
};

export function tryAtomicUpdate<T>(
  fn: (ops: AtomicOperations) => Promise<T>,
  options?: TryAtomicUpdateOptions
): Promise<AtomicUpdateResult<T>>;
export function tryAtomicUpdate<T>(fn: (ops: AtomicOperations) => T, options?: TryAtomicUpdateOptions): AtomicUpdateResult<T>;
export function tryAtomicUpdate<T>(
  fn: (ops: AtomicOperations) => T | Promise<T>,
  options?: TryAtomicUpdateOptions
): AtomicUpdateResult<T> | Promise<AtomicUpdateResult<T>>;
export function tryAtomicUpdate<T>(
  fn: (ops: AtomicOperations) => T | Promise<T>,
  options?: TryAtomicUpdateOptions
): AtomicUpdateResult<T> | Promise<AtomicUpdateResult<T>> {
  return atomicUpdateInternal(fn, options);
}
