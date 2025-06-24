import { describe, expect, it, vi } from 'vitest';
import type { Cell, Computed } from '../src';
import { atomicUpdate, createCell, createComputed, createNullableCell, get } from '../src';

describe('atomicUpdate operations', () => {
  describe('Basic atomicUpdate', () => {
    it('should update single cell atomically', () => {
      const cell = createCell(10);

      atomicUpdate((ops) => {
        ops.set(cell, 20);
        expect(ops.get(cell)).toBe(20); // Should see new value inside
      });

      expect(get(cell)).toBe(20); // Should be committed
    });

    it('should update multiple cells atomically', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const sum = createComputed(({ get }) => get(cell1) + get(cell2));

      atomicUpdate((ops) => {
        ops.set(cell1, 100);
        ops.set(cell2, 200);
        expect(ops.get(sum)).toBe(300); // Should see updated sum
      });

      expect(get(cell1)).toBe(100);
      expect(get(cell2)).toBe(200);
      expect(get(sum)).toBe(300);
    });

    it('should return value from atomicUpdate', () => {
      const cell = createCell(10);

      const result = atomicUpdate((ops) => {
        ops.set(cell, 20);
        return ops.get(cell) * 2;
      });

      expect(result).toBe(40);
      expect(get(cell)).toBe(20);
    });

    it('should trigger Cell onChange on commit', () => {
      const onChange = vi.fn();
      const cell = createCell<number>(10, { onChange });

      atomicUpdate((ops) => {
        ops.set(cell, 20);
        expect(onChange).toHaveBeenCalledTimes(0); // Not called yet
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(10, 20);
    });
  });

  describe('Computed creation inside atomicUpdate', () => {
    it('should create and use computed inside atomicUpdate', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);

      const result = atomicUpdate((ops) => {
        const sum = createComputed(({ get }) => get(cell1) + get(cell2));
        return ops.get(sum);
      });

      expect(result).toBe(30);
    });

    it('should create computed with updated values', () => {
      const cell = createCell(10);
      let computedRef: Computed<number> = null!;

      atomicUpdate((ops) => {
        ops.set(cell, 100);
        computedRef = createComputed(({ get }) => get(cell) * 2);
        expect(ops.get(computedRef)).toBe(200); // Should use updated value
      });

      expect(get(computedRef)).toBe(200); // Should remain consistent after commit
    });

    it('should handle complex state creation pattern', () => {
      const storeCell = createNullableCell<{ count: Cell<number>; doubled: Computed<number> }>(null);

      atomicUpdate((ops) => {
        const count = createCell(0);
        const doubled = createComputed(({ get }) => get(count) * 2);

        ops.set(count, 10);
        ops.set(storeCell, { count, doubled });
      });

      const store = get(storeCell)!;
      expect(get(store.count)).toBe(10);
      expect(get(store.doubled)).toBe(20);
    });
  });

  describe('Nested atomicUpdate', () => {
    it('should handle nested atomicUpdate calls', () => {
      const cell = createCell(10);

      atomicUpdate((ops1) => {
        ops1.set(cell, 20);

        // Nested atomicUpdate with shared context
        atomicUpdate(
          (ops2) => {
            ops2.set(cell, 30);
            expect(ops2.get(cell)).toBe(30);
          },
          { context: ops1.context }
        );

        // Outer should see the committed value from inner
        expect(ops1.get(cell)).toBe(30);
      });

      expect(get(cell)).toBe(30);
    });
  });

  describe('Async atomicUpdate', () => {
    it('should handle async operations', async () => {
      const cell = createCell(10);

      await atomicUpdate(async (ops) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        ops.set(cell, 20);
        expect(ops.get(cell)).toBe(20);
      });

      expect(get(cell)).toBe(20);
    });

    it('should handle multiple async operations', async () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);

      const result = await atomicUpdate(async (ops) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        ops.set(cell1, 100);

        await new Promise((resolve) => setTimeout(resolve, 10));
        ops.set(cell2, 200);

        return ops.get(cell1) + ops.get(cell2);
      });

      expect(result).toBe(300);
      expect(get(cell1)).toBe(100);
      expect(get(cell2)).toBe(200);
    });
  });

  describe('Context isolation', () => {
    it('should isolate changes between concurrent atomicUpdates', async () => {
      const cell = createCell(10);

      // Start two concurrent updates
      const update1 = atomicUpdate(async (ops) => {
        ops.set(cell, 20);
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(ops.get(cell)).toBe(20); // Should see own changes
        return ops.get(cell);
      });

      const update2 = atomicUpdate(async (ops) => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        expect(ops.get(cell)).toBe(10); // Should not see update1's changes
        ops.set(cell, 30);
        return ops.get(cell);
      });

      // One should succeed, one should fail due to optimistic concurrency control
      await expect(Promise.all([update1, update2])).rejects.toThrow('Concurrent value modification');

      // Check that the cell value is either 20 or 30 (whichever committed first)
      const finalValue = get(cell);
      expect([20, 30]).toContain(finalValue);
    });
  });
});
