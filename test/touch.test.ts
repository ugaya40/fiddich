import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, touch, atomicUpdate } from '../src';

describe('Touch functionality', () => {
  describe('Basic touch behavior', () => {
    it('should not increment version for normal values', () => {
      const cell = createCell({ count: 0 });
      const originalVersion = cell.valueVersion;
      
      touch(cell);
      
      expect(get(cell)).toEqual({ count: 0 });
      expect(cell.valueVersion).toBe(originalVersion); // Version should not change
    });

    it('should not trigger recomputation for normal cell values', () => {
      let computeCount = 0;
      const cell = createCell({ items: [1, 2, 3] });
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).items.length;
      });
      
      // Initialize
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
      
      // Touch without mutation
      touch(cell);
      
      // Computed should not be recalculated
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
    });

    it('should trigger updates for NaN values', () => {
      const cell = createCell(NaN);
      const originalVersion = cell.valueVersion;
      let computeCount = 0;
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell);
      });
      
      // Initialize
      expect(get(computed)).toBeNaN();
      expect(computeCount).toBe(1);
      
      // Touch NaN cell
      touch(cell);
      
      // Should trigger update because NaN !== NaN
      expect(cell.valueVersion).toBe(originalVersion + 1);
      expect(get(computed)).toBeNaN();
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

    it('should not trigger onChange for Cell with normal values', () => {
      const onChange = vi.fn();
      const cell = createCell('hello', { onChange });
      
      touch(cell);
      
      expect(onChange).toHaveBeenCalledTimes(0);
    });

    it('should trigger onChange for Cell with NaN', () => {
      const onChange = vi.fn();
      const cell = createCell(NaN, { onChange });
      
      touch(cell);
      
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(NaN, NaN);
    });

    it('should trigger updates with custom compare that returns false', () => {
      let computeCount = 0;
      const onChange = vi.fn();
      const cell = createCell(
        { value: 1 },
        { 
          compare: () => false, // Always consider as changed
          onChange
        }
      );
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).value * 2;
      });
      
      // Initialize
      expect(get(computed)).toBe(2);
      expect(computeCount).toBe(1);
      
      // Touch with custom compare that returns false
      touch(cell);
      
      // Should trigger updates even though value is same
      expect(get(computed)).toBe(2);
      expect(computeCount).toBe(2);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        { value: 1 },
        { value: 1 }
      );
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
        // Touch without mutation should not trigger recomputation
        ops.touch(cell1);
        ops.touch(cell2);
        
        // Computed should not be recalculated
        expect(ops.get(computed)).toBe(3);
        expect(computeCount).toBe(1); // No additional computation
      });
      
      expect(get(computed)).toBe(3);
      expect(computeCount).toBe(1);
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