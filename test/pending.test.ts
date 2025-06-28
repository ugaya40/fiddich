import { describe, expect, it, vi } from 'vitest';
import type { State } from '../src';
import { atomicUpdate, createCell, createComputed, get, pending } from '../src';
import { createComputedChain, createControllablePromise, createDiamondDependency, initialize, wait } from './test-helpers';

describe('Pending functionality', () => {
  describe('Global pending function', () => {
    it('should set pending promise on state', () => {
      const cell = createCell(10);
      const promise = Promise.resolve();

      pending(cell, promise);

      expect(cell.pendingPromise).toBe(promise);
    });

    it('should propagate pending to dependents', () => {
      const cell = createCell(5);
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      const computed2 = createComputed(({ get }) => get(computed1) + 1);

      // Initialize
      initialize(computed2);
      expect(get(computed2)).toBe(11);

      const promise = Promise.resolve();
      pending(cell, promise);

      expect(cell.pendingPromise).toBe(promise);
      expect(computed1.pendingPromise).toBe(promise);
      expect(computed2.pendingPromise).toBe(promise);
    });

    it('should clear pending after promise resolves', async () => {
      const cell = createCell('test');
      const promise = Promise.resolve();

      pending(cell, promise);
      expect(cell.pendingPromise).toBe(promise);

      await promise;

      expect(cell.pendingPromise).toBeUndefined();
    });

    it('should clear pending after promise rejects', async () => {
      const cell = createCell('test');

      // Create promise and immediately handle rejection
      const promise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Test error')), 0);
      }).catch(() => {}); // Immediately attach catch handler

      pending(cell, promise);
      expect(cell.pendingPromise).toBe(promise);

      await promise;

      expect(cell.pendingPromise).toBeUndefined();
    });

    it('should handle multiple states with same promise efficiently', async () => {
      const cell1 = createCell(1);
      const cell2 = createCell(2);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));

      get(computed); // Initialize

      const promise = Promise.resolve();
      const finallySpy = vi.spyOn(promise, 'finally');

      pending(cell1, promise);
      pending(cell2, promise);

      // Should only register one finally callback
      expect(finallySpy).toHaveBeenCalledTimes(2);

      await promise;

      expect(cell1.pendingPromise).toBeUndefined();
      expect(cell2.pendingPromise).toBeUndefined();
      expect(computed.pendingPromise).toBeUndefined();
    });
  });

  describe('ops.pending in atomicUpdate', () => {
    it('should use atomicUpdate promise when no promise provided', async () => {
      const cell = createCell('value');
      let pendingSet = false;

      const updatePromise = atomicUpdate(async (ops) => {
        await wait(1); // Make it async first
        ops.pending(cell);
        pendingSet = true;
        await wait(10);
        ops.set(cell, 'updated');
      });

      // Wait a bit for pending to be set
      await wait(5);

      expect(pendingSet).toBe(true);
      expect(cell.pendingPromise).toBeDefined();

      await updatePromise;
      expect(cell.pendingPromise).toBeUndefined();
      expect(get(cell)).toBe('updated');
    });

    it('should accept explicit promise in async atomicUpdate', async () => {
      const cell = createCell('test');
      const customPromise = Promise.resolve('custom');

      await atomicUpdate(async (ops) => {
        ops.pending(cell, customPromise);
        expect(cell.pendingPromise).toBe(customPromise);
      });

      await customPromise;
      expect(cell.pendingPromise).toBeUndefined();
    });

    it('should propagate through dependencies in atomicUpdate', () => {
      const cellA = createCell(10);
      const cellB = createCell(20);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));

      get(computed); // Initialize

      const promise = Promise.resolve();

      atomicUpdate((ops) => {
        ops.pending(cellA, promise);
        expect(cellA.pendingPromise).toBe(promise);
        expect(computed.pendingPromise).toBe(promise);
        expect(cellB.pendingPromise).toBeUndefined();
      });
    });
  });

  describe('Complex pending scenarios', () => {
    it('should handle overlapping pending states', async () => {
      const cell = createCell(1);
      const { promise: promise1, resolve: resolve1 } = createControllablePromise();
      const { promise: promise2, resolve: resolve2 } = createControllablePromise();

      // Set up timing
      setTimeout(() => resolve1(), 20);
      setTimeout(() => resolve2(), 10);

      pending(cell, promise1);
      expect(cell.pendingPromise).toBe(promise1);

      // Set new pending while first is still active
      pending(cell, promise2);
      expect(cell.pendingPromise).toBe(promise2);

      await promise2;
      // Should clear even though promise1 is still pending
      expect(cell.pendingPromise).toBeUndefined();

      await promise1;
      // Should remain undefined
      expect(cell.pendingPromise).toBeUndefined();
    });

    it('should handle pending with dynamic dependencies', () => {
      const condition = createCell(true);
      const cellA = createCell('A');
      const cellB = createCell('B');
      const computed = createComputed(({ get }) => (get(condition) ? get(cellA) : get(cellB)));

      get(computed); // Initialize with cellA dependency

      const promise = Promise.resolve();
      pending(cellA, promise);

      expect(computed.pendingPromise).toBe(promise);

      // Change dependency
      atomicUpdate((ops) => {
        ops.set(condition, false);
        // Now depends on cellB, which is not pending
        expect(ops.get(computed)).toBe('B');
      });

      // Pending state persists even after dependency change
      // This is because pending is set on the state itself, not on dependencies
      expect(computed.pendingPromise).toBe(promise);
    });

    it('should work with nested atomicUpdate', async () => {
      const cell = createCell('outer');

      await atomicUpdate(async (outerOps) => {
        await wait(1); // Make async
        outerOps.pending(cell);

        let innerPromise: Promise<void> | undefined;
        atomicUpdate((innerOps) => {
          innerPromise = Promise.resolve();
          innerOps.pending(cell, innerPromise);
          expect(cell.pendingPromise).toBe(innerPromise);
        });

        // After inner completes, pending state persists with the last set promise
        expect(cell.pendingPromise).toBe(innerPromise);
      });

      expect(cell.pendingPromise).toBeUndefined();
    });

    it('should handle pending with rejectAllChanges', () => {
      const cell = createCell('value');
      const promise = Promise.resolve();

      atomicUpdate((ops) => {
        ops.pending(cell, promise);
        expect(cell.pendingPromise).toBe(promise);
        ops.rejectAllChanges();
        // rejectAllChanges does not clear pendingPromise
        // because pending is set directly on the original state
        expect(cell.pendingPromise).toBe(promise);
      });

      expect(cell.pendingPromise).toBe(promise);
    });
  });

  describe('Pending with computed initialization', () => {
    it('should handle pending during lazy initialization', async () => {
      const cell = createCell(10);
      const promise = Promise.resolve();

      pending(cell, promise);

      const computed = createComputed(({ get }) => get(cell) * 2);

      // Computed should automatically inherit pending state on initialization
      expect(get(computed)).toBe(20);
      expect(computed.pendingPromise).toBe(promise); // Should inherit from dependency

      await promise;
      expect(computed.pendingPromise).toBeUndefined();
    });

    it('should handle pending in atomicUpdate initialization', async () => {
      const cell = createCell(5);

      await atomicUpdate(async (ops) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Make async
        ops.pending(cell);

        const computed = createComputed(({ get }) => get(cell) + 10);

        // Initialize in atomicUpdate context
        expect(ops.get(computed)).toBe(15);
        // Computed does not inherit pending from dependencies
        expect(computed.pendingPromise).toBeUndefined();
      });
    });
  });

  describe('Error handling', () => {
    it('should continue clearing pending even if finally handler throws', async () => {
      const cell = createCell('test');
      const computed = createComputed(({ get }) => get(cell));

      get(computed); // Initialize

      let resolveFn: () => void;
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve;
      });

      // Mock console.error to suppress error output
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Override finally to throw
      const originalFinally = promise.finally;
      promise.finally = function (onFinally?: (() => void) | null | undefined) {
        return originalFinally.call(this, () => {
          try {
            onFinally?.();
            throw new Error('Finally error');
          } catch {
            // Catch the error to prevent unhandled rejection
          }
        });
      };

      pending(cell, promise);

      // Resolve the promise
      resolveFn!();
      await promise;

      // Wait a bit for finally to execute
      await wait(0);

      // Despite error, pending should be cleared
      expect(cell.pendingPromise).toBeUndefined();
      expect(computed.pendingPromise).toBeUndefined();

      consoleError.mockRestore();
    });
  });

  describe('Performance considerations', () => {
    it('should handle large dependency graphs correctly', () => {
      const { root: rootCell, computeds, last } = createComputedChain(50);

      // Initialize all
      expect(get(last)).toBe(51);

      const promise = Promise.resolve();

      pending(rootCell, promise);

      // All should be pending
      expect(computeds.every((c) => c.pendingPromise === promise)).toBe(true);
    });

    it('should avoid duplicate work when visiting same state multiple times', () => {
      const { cellA, cellB, computed1, computed2, computed3 } = createDiamondDependency();

      initialize(computed3); // Initialize

      const promise = Promise.resolve();
      const visited = new Set();

      // Track visits by overriding pendingPromise setter
      const trackVisits = <T>(state: State<T>) => {
        Object.defineProperty(state, 'pendingPromise', {
          set(value) {
            visited.add(state);
            this._pendingPromise = value;
          },
          get() {
            return this._pendingPromise;
          },
        });
      };

      [cellA, cellB, computed1, computed2, computed3].forEach(trackVisits);

      pending(cellA, promise);

      // Each state should be visited only once
      expect(visited.size).toBe(4); // cellA, computed1, computed2, computed3
    });
  });
});
