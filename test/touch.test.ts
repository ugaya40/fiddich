import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, touch, atomicUpdate } from '../src';

describe('Touch functionality', () => {
  describe('Basic touch behavior', () => {
    it('should increment version without changing value', () => {
      const cell = createCell({ count: 0 });
      const originalVersion = cell.valueVersion;
      
      touch(cell);
      
      expect(get(cell)).toEqual({ count: 0 });
      expect(cell.valueVersion).toBe(originalVersion + 1);
    });

    it('should trigger recomputation for mutable changes', () => {
      let computeCount = 0;
      const cell = createCell({ items: [1, 2, 3] });
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).items.length;
      });
      
      // Initialize
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
      
      // Mutate array in-place
      get(cell).items.push(4);
      
      // Touch to notify about mutation
      touch(cell);
      
      expect(get(computed)).toBe(4);
      expect(computeCount).toBe(2);
    });

    it('should force computed recalculation', () => {
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

  describe('Propagation behavior', () => {
    it('should stop propagation when computed value does not change', () => {
      let compute1Count = 0;
      let compute2Count = 0;
      
      const cell = createCell(5);
      const computed1 = createComputed(({ get }) => {
        compute1Count++;
        return get(cell) + 1; // Always returns 6
      });
      const computed2 = createComputed(({ get }) => {
        compute2Count++;
        return get(computed1) * 2;
      });
      
      // Initialize
      expect(get(computed2)).toBe(12);
      expect(compute1Count).toBe(1);
      expect(compute2Count).toBe(1);
      
      // Touch computed1
      touch(computed1);
      
      // computed1 recalculates but value stays same
      // So computed2 should NOT recalculate
      expect(get(computed2)).toBe(12);
      expect(compute1Count).toBe(2);
      expect(compute2Count).toBe(1);
    });

    it('should trigger onChange callback when value changes', () => {
      const onChange = vi.fn();
      const cell = createCell({ text: 'hello' });
      const computed = createComputed(
        ({ get }) => get(cell).text.toUpperCase(),
        { onChange }
      );
      
      // Initialize
      expect(get(computed)).toBe('HELLO');
      expect(onChange).toHaveBeenCalledWith('HELLO', 'HELLO');
      onChange.mockClear();
      
      // Mutate and touch
      get(cell).text = 'world';
      touch(cell);
      
      expect(get(computed)).toBe('WORLD');
      expect(onChange).toHaveBeenCalledWith('HELLO', 'WORLD');
    });
  });

  describe('atomicUpdate integration', () => {
    it('should batch updates efficiently', () => {
      let computeCount = 0;
      const cell1 = createCell({ value: 1 });
      const cell2 = createCell({ value: 2 });
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell1).value + get(cell2).value;
      });
      
      // Initialize
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
      
      atomicUpdate((ops) => {
        // Multiple mutations
        ops.get(cell1).value = 10;
        ops.touch(cell1);
        
        ops.get(cell2).value = 20;
        ops.touch(cell2);
        
        // Should see final result with minimal recomputation
        expect(ops.get(computed)).toBe(30);
        expect(computeCount).toBe(2); // Only one additional computation
      });
      
      expect(get(computed)).toBe(30);
      expect(computeCount).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle touch on uninitialized computed', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Touch before initialization should not throw
      expect(() => touch(computed)).not.toThrow();
      
      // First access should work normally
      expect(get(computed)).toBe(10);
    });

    it('should not cause infinite loops when touching during computation', () => {
      const cell = createCell(1);
      const computed = createComputed(({ get }) => {
        const value = get(cell);
        if (value < 5) {
          // This could potentially cause infinite loop
          // but should be handled gracefully
          touch(cell);
        }
        return value;
      });
      
      expect(() => get(computed)).not.toThrow();
      expect(get(computed)).toBe(1);
    });
  });
});