export type Compare<T> = (prev: T, newValue: T) => boolean;

export const defaultCompare: Compare<unknown> = (prev: unknown , newValue: unknown): boolean => prev === newValue;

export function assertUnreachable(x: never): never {
  throw new Error(`unexpected value reached: ${JSON.stringify(x)}`);
}

export function isDisposable(value: unknown): value is Disposable {
  return value != null && 
         typeof value === 'object' && 
         Symbol.dispose in value &&
         typeof value[Symbol.dispose] === 'function';
}

let counter = 0;
export function generateStateId(): string {
  counter++;
  return `${counter}`;
}

/**
 * Creates a lazily initialized function.
 * The factory is called only once on the first invocation,
 * and the result is cached for subsequent calls.
 * 
 * @example
 * const lazyGet = lazyFunction(() => createGet(context));
 * 
 * // createGet is not called yet
 * lazyGet(state); // createGet is called here, then get(state) is executed
 * lazyGet(state2); // uses cached get function
 */
export function lazyFunction<T extends (...args: any[]) => any>(
  factory: () => T
): T {
  let fn: T | undefined;
  
  return ((...args) => {
    if (!fn) {
      fn = factory();
    }
    return fn(...args);
  }) as T;
}