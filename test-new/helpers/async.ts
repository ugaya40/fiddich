// Async helpers
export async function wait(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createControllablePromise<T = void>() {
  let resolveFn: (value: T) => void;
  let rejectFn: (error: Error) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve: resolveFn!,
    reject: rejectFn!,
  };
}

export async function waitForMicrotasks() {
  await new Promise((resolve) => queueMicrotask(resolve));
}