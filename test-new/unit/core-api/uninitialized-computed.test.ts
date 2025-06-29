import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate, pending, touch } from '../../../src';
import type { Computed } from '../../../src';

describe('uninitialized computed behavior', () => {
  describe('dispose with uninitialized computed', () => {
    it('should handle dispose when dependency is already disposed', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Do not initialize computed
      cell[Symbol.dispose]();
      
      // Computed should be marked as disposed when trying to access disposed dependency
      expect(() => get(computed)).toThrow('Cannot access disposed state');
      expect(computed.isDisposed).toBe(true);
    });

    it('should handle partial disposal of multiple dependencies', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const cellC = createCell(3);
      
      const computed = createComputed(({ get }) => {
        return get(cellA) + get(cellB) + get(cellC);
      });
      
      // Do not initialize
      cellA[Symbol.dispose]();
      cellB[Symbol.dispose]();
      
      // Should throw when trying to access with some disposed dependencies
      expect(() => get(computed)).toThrow('Cannot access disposed state');
      expect(computed.isDisposed).toBe(true);
    });

    it('should handle disposal chain of uninitialized computeds', () => {
      const cell = createCell(5);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 1);
      const computedC = createComputed(({ get }) => get(computedB) * 3);
      
      // None are initialized
      cell[Symbol.dispose]();

      expect(() => get(computedC)).toThrow('Cannot access disposed state');
      expect(() => get(computedB)).toThrow('Cannot access disposed state');
      expect(() => get(computedA)).toThrow('Cannot access disposed state');
      
      // All should be disposed in chain
      expect(cell.isDisposed).toBe(true);
      expect(computedA.isDisposed).toBe(true);
      expect(computedB.isDisposed).toBe(true);
      expect(computedC.isDisposed).toBe(true);
    });

    it('should handle mixed initialized and uninitialized computeds in disposal', () => {
      const cell = createCell(10);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 5);
      const computedC = createComputed(({ get }) => get(computedB) / 2);
      
      // Initialize only computedB
      expect(get(computedB)).toBe(25);
      
      computedB[Symbol.dispose]();
      
      // All should be disposed
      expect(cell.isDisposed).toBe(false);
      expect(computedA.isDisposed).toBe(false);
      expect(computedB.isDisposed).toBe(true);

      expect(computedC.isDisposed).toBe(false);

      expect(() => get(computedC)).toThrow('Cannot access disposed state');

      expect(computedC.isDisposed).toBe(true);
    });

    it('should handle dispose in atomicUpdate with uninitialized computed', () => {
      const cell = createCell(42);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Do not initialize
      atomicUpdate(({ dispose }) => {
        dispose(cell);
        // This should not throw even though computed is uninitialized
        dispose(computed);
      });
      
      expect(cell.isDisposed).toBe(true);
      expect(computed.isDisposed).toBe(true);
    });
  });

  describe('pending with uninitialized computed', () => {
    it('should inherit pending state when initialized', async () => {
      const cell = createCell(10);
      const promise = Promise.resolve();
      
      pending(cell, promise);
      
      // Create computed after pending is set
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Should inherit pending on first access
      expect(get(computed)).toBe(20);
      expect(computed.pendingPromise).toBe(promise);
      
      await promise;
      expect(computed.pendingPromise).toBeUndefined();
    });

    it('should handle multiple pending dependencies', async () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const promiseA = Promise.resolve();
      const promiseB = Promise.resolve();
      
      pending(cellA, promiseA);
      pending(cellB, promiseB);
      
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));
      
      // Should create Promise.all for multiple pending
      expect(get(computed)).toBe(3);
      expect(computed.pendingPromise).toBeDefined();
      expect(computed.pendingPromise).not.toBe(promiseA);
      expect(computed.pendingPromise).not.toBe(promiseB);
      
      await Promise.all([promiseA, promiseB, computed.pendingPromise]);
      expect(computed.pendingPromise).toBeUndefined();
    });

    it('should handle pending in deep uninitialized chain', async () => {
      const cell = createCell(5);
      const promise = Promise.resolve();
      
      pending(cell, promise);
      
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 1);
      const computedC = createComputed(({ get }) => get(computedB) * 3);
      
      // Access only the last one
      expect(get(computedC)).toBe(33); // (5 * 2 + 1) * 3
      
      // All should have pending
      expect(computedA.pendingPromise).toBe(promise);
      expect(computedB.pendingPromise).toBe(promise);
      expect(computedC.pendingPromise).toBe(promise);
      
      await promise;
      expect(computedA.pendingPromise).toBeUndefined();
      expect(computedB.pendingPromise).toBeUndefined();
      expect(computedC.pendingPromise).toBeUndefined();
    });
  });

  describe('circular dependencies with uninitialized', () => {
    it('should detect circular dependency between uninitialized computeds', () => {
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      computedA = createComputed(({ get }) => get(computedB) + 1);
      computedB = createComputed(({ get }) => get(computedA) + 1);
      
      expect(() => get(computedA)).toThrow(/circular/i);
    });

    it('should detect circular dependency with mixed initialization states', () => {
      const cell = createCell(10);
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      computedA = createComputed(({ get }) => get(cell) + get(computedB));
      computedB = createComputed(({ get }) => get(computedA) * 2);
      
      // Initialize A first
      expect(() => get(computedA)).toThrow(/circular/i);
    });

    it('should detect complex circular dependency with uninitialized', () => {
      const cell = createCell(1);
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      let computedC: Computed<number>;
      computedA = createComputed(({ get }) => get(cell) + get(computedC));
      computedB = createComputed(({ get }) => get(computedA) * 2);
      computedC = createComputed(({ get }) => get(computedB) - 1);
      
      expect(() => get(computedA)).toThrow(/circular/i);
    });
  });

  describe('dependency changes while uninitialized', () => {
    it('should track dependency changes even when uninitialized', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => {
        return get(condition) ? get(cellA) : get(cellB);
      });
      
      // Do not initialize yet
      
      // Change condition
      set(condition, false);
      
      // Now initialize - should use cellB
      expect(get(computed)).toBe(20);
      
      // Verify dependencies
      set(cellA, 30);
      expect(get(computed)).toBe(20); // Not affected
      
      set(cellB, 40);
      expect(get(computed)).toBe(40); // Affected
    });

    it('should handle touch on uninitialized computed', () => {
      const cell = createCell(1);
      const computation = vi.fn(({ get }) =>  get(cell) * 2);
      const computed = createComputed(computation);
      const onChange = vi.fn();
      
      // Set up change listener
      computed.onScheduledNotify = onChange;
      
      // Touch before initialization
      touch(computed);
      
      // Touch triggers initialization and computation once
      expect(computation).toHaveBeenCalledTimes(1);
      
      // No notification because no one is observing this uninitialized computed
      expect(onChange).toHaveBeenCalledTimes(0);
      
      // First access should compute
      expect(get(computed)).toBe(2);
      expect(computation).toHaveBeenCalledTimes(1);
    });

    it('should handle complex dependency switch while uninitialized', () => {
      const mode = createCell('A');
      const valueA = createCell(100);
      const valueB = createCell(200);
      const valueC = createCell(300);
      
      const computed = createComputed(({ get }) => {
        const m = get(mode);
        switch (m) {
          case 'A': return get(valueA);
          case 'B': return get(valueB);
          case 'C': return get(valueC);
          default: return 0;
        }
      });
      
      // Change mode multiple times before initialization
      set(mode, 'B');
      set(mode, 'C');
      set(mode, 'B');
      
      // Initialize - should depend on valueB
      expect(get(computed)).toBe(200);
      
      // Verify dependencies
      set(valueA, 150);
      expect(get(computed)).toBe(200); // Not affected
      
      set(valueC, 350);
      expect(get(computed)).toBe(200); // Not affected
      
      set(valueB, 250);
      expect(get(computed)).toBe(250); // Affected
    });
  });

  describe('atomicUpdate interactions with uninitialized', () => {
    it('should handle uninitialized computed created and used in same atomicUpdate', () => {
      const cell = createCell(5);
      
      const result = atomicUpdate(({ get, set }) => {
        const computed = createComputed(({ get }) => get(cell) * 3);
        set(cell, 10);
        return get(computed);
      });
      
      expect(result).toBe(30); // Uses the new value
    });

    it('should handle uninitialized computed across multiple atomicUpdates', () => {
      const cell = createCell(1);
      let computed: any;
      
      atomicUpdate(() => {
        computed = createComputed(({ get }) => get(cell) * 10);
        // Do not access
      });
      
      atomicUpdate(({ set }) => {
        set(cell, 2);
        // Still not accessed
      });
      
      // Access outside atomicUpdate
      expect(get(computed)).toBe(20);
    });

    it('should handle dispose and recreate pattern with uninitialized', () => {
      const cell = createCell(42);
      let computed = createComputed(({ get }) => get(cell) * 2);
      
      // Dispose without initializing
      computed[Symbol.dispose]();
      
      // Create new computed with same logic
      computed = createComputed(({ get }) => get(cell) * 2);
      
      // Should work normally
      expect(get(computed)).toBe(84);
    });
  });
});