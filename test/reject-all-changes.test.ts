import { describe, expect, it, vi } from 'vitest';
import { atomicUpdate, createCell, createComputed, get } from '../src';
import { createDisposable, createSimpleChain, wait } from './test-helpers';

describe('rejectAllChanges', () => {
  describe('Basic functionality', () => {
    it('should reject all changes in sync atomicUpdate', () => {
      const cell1 = createCell(10);
      const cell2 = createCell('hello');

      atomicUpdate((ops) => {
        ops.set(cell1, 20);
        ops.set(cell2, 'world');
        ops.rejectAllChanges();
      });

      expect(get(cell1)).toBe(10);
      expect(get(cell2)).toBe('hello');
    });

    it('should reject changes made before rejectAllChanges', () => {
      const cell = createCell(1);

      atomicUpdate((ops) => {
        ops.set(cell, 2);
        ops.set(cell, 3);
        ops.set(cell, 4);
        ops.rejectAllChanges();
      });

      expect(get(cell)).toBe(1);
    });

    it('should allow operations after rejectAllChanges', () => {
      const cell = createCell('initial');

      atomicUpdate((ops) => {
        ops.set(cell, 'first change');
        ops.rejectAllChanges();
        ops.set(cell, 'second change');
      });

      expect(get(cell)).toBe('second change');
    });

    it('should reject all changes in async atomicUpdate', async () => {
      const cell = createCell('initial');

      await atomicUpdate(async (ops) => {
        ops.set(cell, 'changed');
        await wait(10);
        ops.rejectAllChanges();
      });

      expect(get(cell)).toBe('initial');
    });

    it('should allow async operations after rejectAllChanges', async () => {
      const cell = createCell(0);

      await atomicUpdate(async (ops) => {
        ops.set(cell, 100);
        ops.rejectAllChanges();
        await wait(10);
        ops.set(cell, 200);
      });

      expect(get(cell)).toBe(200);
    });
  });

  describe('Complex scenarios', () => {
    it('should work with computed dependencies', () => {
      const cellA = createCell(5);
      const cellB = createCell(3);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));

      atomicUpdate((ops) => {
        expect(ops.get(computed)).toBe(8);
        ops.set(cellA, 10);
        expect(ops.get(computed)).toBe(13);
        ops.rejectAllChanges();
        expect(ops.get(computed)).toBe(8);
        ops.set(cellB, 7);
        expect(ops.get(computed)).toBe(12);
      });

      expect(get(cellA)).toBe(5);
      expect(get(cellB)).toBe(7);
      expect(get(computed)).toBe(12);
    });

    it('should reset newly initialized computed', () => {
      const { cell, computed1 } = createSimpleChain(10);

      atomicUpdate((ops) => {
        // Initialize computed in atomicUpdate
        expect(ops.get(computed1)).toBe(20);
        ops.set(cell, 15);
        expect(ops.get(computed1)).toBe(30);
        ops.rejectAllChanges();
      });

      // Computed should be initialized with original value
      expect(get(computed1)).toBe(20);
      expect(get(cell)).toBe(10);
    });

    it('should not trigger onChange when changes are rejected', () => {
      const onChange = vi.fn();
      const cell = createCell<number>(10, { onChange });

      atomicUpdate((ops) => {
        ops.set(cell, 20);
        ops.rejectAllChanges();
      });

      expect(onChange).toHaveBeenCalledTimes(0);
      expect(get(cell)).toBe(10);
    });

    it('should handle multiple rejectAllChanges calls', () => {
      const cell = createCell('test');

      atomicUpdate((ops) => {
        ops.set(cell, 'change1');
        ops.rejectAllChanges();
        ops.set(cell, 'change2');
        ops.rejectAllChanges();
        ops.set(cell, 'change3');
      });

      expect(get(cell)).toBe('change3');
    });

    it('should work with conditional rejection', () => {
      const cell = createCell(0);
      const shouldReject = true;

      atomicUpdate((ops) => {
        ops.set(cell, 100);
        if (shouldReject) {
          ops.rejectAllChanges();
          ops.set(cell, 50);
        }
      });

      expect(get(cell)).toBe(50);
    });
  });

  describe('Nested atomicUpdate', () => {
    it('should not affect outer atomicUpdate when used in nested', () => {
      const cell = createCell('outer');

      atomicUpdate((outerOps) => {
        outerOps.set(cell, 'outer-changed');

        atomicUpdate((innerOps) => {
          innerOps.set(cell, 'inner-changed');
          innerOps.rejectAllChanges();
        });

        expect(outerOps.get(cell)).toBe('outer-changed');
      });

      expect(get(cell)).toBe('outer-changed');
    });

    it('should handle rejectAllChanges in both nested and outer atomicUpdate', () => {
      const cell = createCell(1);

      // Independent nested atomicUpdate causes conflict in current implementation
      expect(() => {
        atomicUpdate((outerOps) => {
          outerOps.set(cell, 2);

          atomicUpdate((innerOps) => {
            innerOps.set(cell, 3);
            innerOps.rejectAllChanges();
            innerOps.set(cell, 4);
          });

          // This line would not be reached due to conflict
          outerOps.rejectAllChanges();
          outerOps.set(cell, 5);
        });
      }).toThrow(/Concurrent value modification detected/);

      // Inner atomicUpdate won, so value is 4
      expect(get(cell)).toBe(4);
    });
  });

  describe('Interaction with other operations', () => {
    it('should cancel dispose operations', () => {
      const { disposable, disposed } = createDisposable();

      atomicUpdate((ops) => {
        ops.dispose(disposable);
        ops.rejectAllChanges();
      });

      expect(disposed).not.toHaveBeenCalled();
    });

    it('should allow dispose after rejectAllChanges', () => {
      const { disposable: disposable1, disposed: disposed1 } = createDisposable();
      const { disposable: disposable2, disposed: disposed2 } = createDisposable();

      atomicUpdate((ops) => {
        ops.dispose(disposable1);
        ops.rejectAllChanges();
        ops.dispose(disposable2);
      });

      expect(disposed1).not.toHaveBeenCalled();
      expect(disposed2).toHaveBeenCalledTimes(1);
    });

    it('should reset touch operations', () => {
      const cell = createCell({ value: 1 });
      const computed = createComputed(({ get }) => {
        const obj = get(cell);
        return obj.value * 2;
      });

      let changeCount = 0;
      const watchComputed = createComputed(
        ({ get }) => {
          changeCount++;
          return get(computed);
        },
        { onChange: () => {} } // Add onChange to track changes
      );

      // Initialize
      get(watchComputed);
      changeCount = 0;

      atomicUpdate((ops) => {
        // Mutation happens on the original object, not the copy
        get(cell).value = 2; // This mutates the actual object
        ops.touch(cell);
        ops.rejectAllChanges();
      });

      // The object was mutated, so the value changed
      expect(get(cell).value).toBe(2);
      // But rejectAllChanges prevented the touch notification
      expect(changeCount).toBe(0);
    });

    it('should handle pending operations correctly', () => {
      const cell = createCell('value');
      const testPromise = Promise.resolve();

      atomicUpdate((ops) => {
        ops.pending(cell, testPromise);
        expect(cell.pendingPromise).toBe(testPromise);
        ops.rejectAllChanges();
        // rejectAllChanges does not clear pendingPromise
        expect(cell.pendingPromise).toBe(testPromise);
      });

      expect(cell.pendingPromise).toBe(testPromise);
    });
  });

  describe('Return values', () => {
    it('should return the value from atomicUpdate even when rejected', () => {
      const cell = createCell(42);

      const result = atomicUpdate((ops) => {
        ops.set(cell, 100);
        ops.rejectAllChanges();
        return 'returned value';
      });

      expect(result).toBe('returned value');
      expect(get(cell)).toBe(42);
    });

    it('should handle async return values when rejected', async () => {
      const cell = createCell('async');

      const result = await atomicUpdate(async (ops) => {
        ops.set(cell, 'modified');
        await wait(5);
        ops.rejectAllChanges();
        return 123;
      });

      expect(result).toBe(123);
      expect(get(cell)).toBe('async');
    });
  });

  describe('Dynamic dependencies after reject', () => {
    it('should handle dynamic dependencies correctly after reject', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      const computed = createComputed(({ get }) => (get(condition) ? get(cellA) : get(cellB)));

      atomicUpdate((ops) => {
        expect(ops.get(computed)).toBe(10);
        ops.set(condition, false);
        expect(ops.get(computed)).toBe(20);
        ops.rejectAllChanges();
        // After reject, should use original dependencies
        ops.set(cellA, 15);
        expect(ops.get(computed)).toBe(15);
      });

      expect(get(computed)).toBe(15);
      expect(get(cellA)).toBe(15);
      expect(get(condition)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should not affect rejectAllChanges on error', () => {
      const cell = createCell(1);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell, 2);
          ops.rejectAllChanges();
          ops.set(cell, 3);
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Even though error occurred after set(3), nothing should be committed
      expect(get(cell)).toBe(1);
    });
  });
});
