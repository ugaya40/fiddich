import { vi } from 'vitest';
import type { Cell, Computed, State } from '../src';
import { createCell, createComputed, get } from '../src';

// Disposable helpers
export function createDisposable(data?: string) {
  const disposed = vi.fn();
  const disposable = data ? { data, [Symbol.dispose]: disposed } : { [Symbol.dispose]: disposed };
  return { disposable, disposed };
}

export function createDisposables(...data: string[]) {
  return data.map((d) => createDisposable(d));
}

export function createDisposeTracker() {
  const disposeOrder: string[] = [];
  const createTrackedDisposable = (name: string) => ({
    [Symbol.dispose]: vi.fn(() => disposeOrder.push(name)),
  });
  return { disposeOrder, createTrackedDisposable };
}

// State creation helpers
export function createSimpleChain(initialValue = 10) {
  const cell = createCell(initialValue);
  const computed1 = createComputed(({ get }) => get(cell) * 2);
  const computed2 = createComputed(({ get }) => get(computed1) + 1);
  return { cell, computed1, computed2 };
}

export function createDiamondDependency() {
  const cellA = createCell(1);
  const cellB = createCell(2);
  const computed1 = createComputed(({ get }) => get(cellA) + get(cellB));
  const computed2 = createComputed(({ get }) => get(cellA) * get(cellB));
  const computed3 = createComputed(({ get }) => get(computed1) + get(computed2));
  return { cellA, cellB, computed1, computed2, computed3 };
}

export function createComputedChain(
  length: number,
  initialValue = 1
): {
  root: Cell<number>;
  computeds: Computed<number>[];
  last: Computed<number>;
} {
  const root = createCell(initialValue);
  const computeds: Computed<number>[] = [];

  let prev: State<number> = root;
  for (let i = 0; i < length; i++) {
    const capturedPrev: State<number> = prev;
    const comp: Computed<number> = createComputed(({ get }) => get(capturedPrev) + 1);
    computeds.push(comp);
    prev = comp;
  }

  return { root, computeds, last: computeds[computeds.length - 1] };
}

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

// State initialization helper
export function initialize(...states: State[]) {
  states.forEach((state) => get(state));
}
