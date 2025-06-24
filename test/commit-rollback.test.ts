import { describe, expect, it } from 'vitest';
import type { Cell, Computed } from '../src';
import { atomicUpdate, createCell, createComputed, createNullableCell, get } from '../src';

describe('Commit and Rollback', () => {
  describe('Successful commits', () => {
    it('should commit changes when no error occurs', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);

      atomicUpdate((ops) => {
        ops.set(cell1, 100);
        ops.set(cell2, 200);
      });

      expect(get(cell1)).toBe(100);
      expect(get(cell2)).toBe(200);
    });

    it('should commit computed recalculations', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      // Initialize computed
      expect(get(computed)).toBe(20);

      atomicUpdate((ops) => {
        ops.set(cell, 50);
        expect(ops.get(computed)).toBe(100); // Should see new computed value
      });

      expect(get(computed)).toBe(100); // Should be committed
    });
  });

  describe('Rollback on errors', () => {
    it('should rollback all changes on error', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell1, 100);
          ops.set(cell2, 200);
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Values should remain unchanged
      expect(get(cell1)).toBe(10);
      expect(get(cell2)).toBe(20);
    });

    it('should rollback computed changes on error', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      // Initialize
      expect(get(computed)).toBe(20);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell, 50);
          expect(ops.get(computed)).toBe(100); // Should see new value inside
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should rollback to original values
      expect(get(cell)).toBe(10);
      expect(get(computed)).toBe(20);
    });

    it('should rollback state created inside atomicUpdate', () => {
      const storeCell = createNullableCell<{ count: Cell<number>; doubled: Computed<number> }>(null);

      expect(() => {
        atomicUpdate((ops) => {
          const count = createCell(10);
          const doubled = createComputed(({ get }) => get(count) * 2);
          ops.set(storeCell, { count, doubled });
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Store should remain null
      expect(get(storeCell)).toBe(null);
    });

    it('should handle async rollback', async () => {
      const cell = createCell(10);

      await expect(async () => {
        await atomicUpdate(async (ops) => {
          ops.set(cell, 100);
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error('Async error');
        });
      }).rejects.toThrow('Async error');

      expect(get(cell)).toBe(10); // Should be rolled back
    });
  });

  describe('Partial execution rollback', () => {
    it('should rollback even after multiple operations', () => {
      const cells = Array.from({ length: 5 }, (_, i) => createCell(i));

      expect(() => {
        atomicUpdate((ops) => {
          // Update first 3 cells
          ops.set(cells[0], 100);
          ops.set(cells[1], 101);
          ops.set(cells[2], 102);

          // Error before updating the rest
          throw new Error('Partial execution error');
        });
      }).toThrow('Partial execution error');

      // All cells should have original values
      cells.forEach((cell, i) => {
        expect(get(cell)).toBe(i);
      });
    });

    it('should rollback dependency changes on error', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      const computed = createComputed(({ get }) => (get(condition) ? get(cellA) : get(cellB)));

      // Initialize
      expect(get(computed)).toBe(10);
      expect(computed.dependencies.has(cellA)).toBe(true);
      expect(computed.dependencies.has(cellB)).toBe(false);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(condition, false);
          // This would change dependencies
          expect(ops.get(computed)).toBe(20);
          throw new Error('Dependency rollback test');
        });
      }).toThrow('Dependency rollback test');

      // Dependencies should be rolled back
      expect(get(computed)).toBe(10);
      expect(computed.dependencies.has(cellA)).toBe(true);
      expect(computed.dependencies.has(cellB)).toBe(false);
    });
  });

  describe('Error propagation', () => {
    it('should preserve error type and message', () => {
      const cell = createCell(10);

      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell, 100);
          throw new CustomError('Custom error message');
        });
      }).toThrow(CustomError);

      expect(get(cell)).toBe(10); // Should be rolled back
    });

    it('should handle errors in computed recalculation', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => {
        const value = get(cell);
        if (value > 50) {
          throw new Error('Computed error');
        }
        return value * 2;
      });

      // Initialize
      expect(get(computed)).toBe(20);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell, 100); // This will cause computed to throw
          ops.get(computed); // Trigger recalculation
        });
      }).toThrow('Computed error');

      // Should rollback
      expect(get(cell)).toBe(10);
      expect(get(computed)).toBe(20);
    });
  });
});
