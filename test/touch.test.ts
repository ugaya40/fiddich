import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, touch, atomicUpdate, Computed } from '../src';

describe('Touch functionality', () => {
  describe('Basic touch behavior', () => {
    it('should NOT increment version when cell is touched', () => {
      const cell = createCell({ count: 0 });
      const originalVersion = cell.valueVersion;
      
      touch(cell);
      
      expect(get(cell)).toEqual({ count: 0 });
      expect(cell.valueVersion).toBe(originalVersion); // Version should NOT change
    });

    it('should trigger recomputation when cell is touched', () => {
      let computeCount = 0;
      const cell = createCell({ items: [1, 2, 3] });
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).items.length;
      });
      
      // Initialize
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
      
      // Touch cell
      touch(cell);
      
      // Computed should be recalculated even though value doesn't change
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(2);
    });

    it('should force computed recalculation when touched directly', () => {
      let computeCount = 0;
      const cell = createCell(10);
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell) * 2;
      });
      
      // Initialize
      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1);
      
      // Touch computed directly
      touch(computed);
      
      expect(get(computed)).toBe(20); // Same value
      expect(computeCount).toBe(2); // But recomputed
    });
  });

  describe('Notification behavior', () => {
    it('should trigger onScheduledNotify when cell is touched', async () => {
      const onScheduledNotify = vi.fn();
      const cell = createCell('hello', { onScheduledNotify });
      
      touch(cell);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      expect(onScheduledNotify).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger onChange when cell is touched (value unchanged)', () => {
      const onChange = vi.fn();
      const cell = createCell('hello', { onChange });
      
      touch(cell);
      
      expect(onChange).toHaveBeenCalledTimes(0);
    });

    it('should trigger onScheduledNotify for computed when touched', async () => {
      const onScheduledNotify = vi.fn();
      const cell = createCell(5);
      const computed = createComputed(
        ({ get }) => get(cell) * 2,
        { onScheduledNotify }
      );
      
      // Initialize
      expect(get(computed)).toBe(10);
      
      // Touch computed
      touch(computed);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      expect(onScheduledNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('Propagation behavior', () => {
    it('should propagate touch through entire dependency chain', async () => {
      const onScheduledNotify1 = vi.fn();
      const onScheduledNotify2 = vi.fn();
      const onScheduledNotify3 = vi.fn();
      
      const cell = createCell(1, { onScheduledNotify: onScheduledNotify1 });
      const computed1 = createComputed(
        ({ get }) => get(cell) + 1,
        { onScheduledNotify: onScheduledNotify2 }
      );
      const computed2 = createComputed(
        ({ get }) => get(computed1) * 2,
        { onScheduledNotify: onScheduledNotify3 }
      );
      
      // Initialize
      expect(get(computed2)).toBe(4);
      
      // Touch the root cell
      touch(cell);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // All should be notified
      expect(onScheduledNotify1).toHaveBeenCalledTimes(1);
      expect(onScheduledNotify2).toHaveBeenCalledTimes(1);
      expect(onScheduledNotify3).toHaveBeenCalledTimes(1);
    });

    it('should propagate even when computed values do not change', async () => {
      let compute1Count = 0;
      let compute2Count = 0;
      const onScheduledNotify2 = vi.fn();
      
      const cell = createCell(5);
      const computed1 = createComputed(({ get }) => {
        compute1Count++;
        return Math.min(get(cell), 3); // Always returns 3
      });
      const computed2 = createComputed(
        ({ get }) => {
          compute2Count++;
          return get(computed1) * 2;
        },
        { onScheduledNotify: onScheduledNotify2 }
      );
      
      // Initialize
      expect(get(computed2)).toBe(6);
      expect(compute1Count).toBe(1);
      expect(compute2Count).toBe(1);
      
      // Touch cell
      touch(cell);
      
      // Both should recalculate
      expect(get(computed2)).toBe(6); // Same value
      expect(compute1Count).toBe(2);
      expect(compute2Count).toBe(2);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // computed2 should be notified even though its value didn't change
      expect(onScheduledNotify2).toHaveBeenCalledTimes(1);
    });
  });

  describe('atomicUpdate integration', () => {
    it('should batch touch operations', async () => {
      const onScheduledNotify1 = vi.fn();
      const onScheduledNotify2 = vi.fn();
      const cell1 = createCell({ value: 1 }, { onScheduledNotify: onScheduledNotify1 });
      const cell2 = createCell({ value: 2 }, { onScheduledNotify: onScheduledNotify2 });
      
      atomicUpdate((ops) => {
        ops.touch(cell1);
        ops.touch(cell2);
      });
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // Both should be notified in one batch
      expect(onScheduledNotify1).toHaveBeenCalledTimes(1);
      expect(onScheduledNotify2).toHaveBeenCalledTimes(1);
    });

    it('should handle touch and set in same atomicUpdate', async () => {
      const onChange = vi.fn();
      const onScheduledNotify = vi.fn();
      const cell = createCell<number>(1, { onChange, onScheduledNotify });
      
      atomicUpdate((ops) => {
        ops.set(cell, 10);  // Actually changes value
        ops.touch(cell);    // Also touches
      });
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // Value changed, so onChange should be called
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(1, 10);
      
      // Should also be notified
      expect(onScheduledNotify).toHaveBeenCalledTimes(1);
      
      // Version should increment (because value changed)
      expect(cell.valueVersion).toBe(1);
    });
  });

  describe('Custom compare function', () => {
    it('should respect custom compare when touched', async () => {
      const onChange = vi.fn();
      const onScheduledNotify = vi.fn();
      const cell = createCell(
        { value: 1 },
        { 
          compare: () => false, // Always consider as changed
          onChange,
          onScheduledNotify
        }
      );
      
      // Even normal set should trigger onChange due to custom compare
      atomicUpdate((ops) => {
        ops.set(cell, { value: 1 }); // Same value but compare returns false
      });
      
      expect(onChange).toHaveBeenCalledTimes(1);
      
      // Wait for scheduled notifications to complete
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // Reset
      onChange.mockClear();
      onScheduledNotify.mockClear();
      
      // Touch should NOT trigger onChange (value not actually changing)
      touch(cell);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      expect(onChange).toHaveBeenCalledTimes(0);
      expect(onScheduledNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle touch on uninitialized computed', async () => {
      const onScheduledNotify = vi.fn();
      const cell = createCell(5);
      const computed = createComputed(
        ({ get }) => get(cell) * 2,
        { onScheduledNotify }
      );
      
      // Touch before initialization
      expect(() => touch(computed)).not.toThrow();
      
      // First access should work normally
      expect(get(computed)).toBe(10);
      
      // Wait for microtask
      await new Promise<void>(resolve => queueMicrotask(() => resolve()));
      
      // Should have been notified
      expect(onScheduledNotify).toHaveBeenCalledTimes(1);
    });

    it('should handle circular dependencies gracefully', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      
      let useA = true;
      const computedA: Computed<number> = createComputed(({ get }) => {
        return useA ? get(cellA) : get(computedB);
      });
      
      const computedB: Computed<number> = createComputed(({ get }) => {
        return get(cellB) + get(computedA);
      });
      
      // Initialize
      expect(get(computedB)).toBe(3); // 2 + 1
      
      // Change dependency pattern
      useA = false;
      
      // This will update computedA's dependencies
      touch(computedA);
      
      // Now computedA depends on computedB, and computedB depends on computedA
      // Touch should still work without infinite loop
      expect(() => touch(cellA)).not.toThrow();
    });

    it('should handle touching during computation', () => {
      const cell = createCell(1);
      const computed = createComputed(({ get }) => {
        const value = get(cell);
        if (value < 5) {
          // This could potentially cause issues
          touch(cell);
        }
        return value;
      });
      
      // Should not throw or cause infinite loop
      expect(() => get(computed)).not.toThrow();
      expect(get(computed)).toBe(1);
    });
  });
});