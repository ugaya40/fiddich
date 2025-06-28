import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set } from '../../../src';

describe('createComputed', () => {
  describe('lazy initialization', () => {
    it('should not execute computation until first get', () => {
      const computation = vi.fn(() => 42);
      const computed = createComputed(computation);

      expect(computation).not.toHaveBeenCalled();

      const value = get(computed);
      expect(value).toBe(42);
      expect(computation).toHaveBeenCalledTimes(1);
    });

    it('should track dependencies only when executed', () => {
      const cell = createCell(10);
      const computation = vi.fn(({ get }) => get(cell) * 2);
      const computed = createComputed(computation);

      // Not executed yet, so dependency not established
      // But when first accessed, it will use the current cell value
      set(cell, 20);
      expect(computation).not.toHaveBeenCalled();

      // First get establishes dependency and uses current value (20)
      expect(get(computed)).toBe(40); // 20 * 2
      expect(computation).toHaveBeenCalledTimes(1);

      // Now changing cell should trigger recomputation
      set(cell, 30);
      expect(computation).toHaveBeenCalledTimes(2);
      expect(get(computed)).toBe(60);
    });
  });

  describe('dependency tracking', () => {
    it('should track single dependency', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) * 3);

      expect(get(computed)).toBe(15);

      set(cell, 10);
      expect(get(computed)).toBe(30);
    });

    it('should track multiple dependencies', () => {
      const cellA = createCell(2);
      const cellB = createCell(3);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));

      expect(get(computed)).toBe(5);

      set(cellA, 4);
      expect(get(computed)).toBe(7);

      set(cellB, 5);
      expect(get(computed)).toBe(9);
    });

    it('should track nested computed dependencies', () => {
      const cell = createCell(1);
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      const computed2 = createComputed(({ get }) => get(computed1) + 10);

      expect(get(computed2)).toBe(12);

      set(cell, 5);
      expect(get(computed2)).toBe(20);
    });
  });

  describe('caching behavior', () => {
    it('should cache result when dependencies unchanged', () => {
      const cell = createCell(10);
      const computation = vi.fn(({ get }) => get(cell) * 2);
      const computed = createComputed(computation);

      // First access
      expect(get(computed)).toBe(20);
      expect(computation).toHaveBeenCalledTimes(1);

      // Second access without change
      expect(get(computed)).toBe(20);
      expect(computation).toHaveBeenCalledTimes(1);

      // Third access without change
      expect(get(computed)).toBe(20);
      expect(computation).toHaveBeenCalledTimes(1);

      // Third access without change
      set(cell, 10);
      expect(get(computed)).toBe(20);
      expect(computation).toHaveBeenCalledTimes(1);
    });

    it('should recompute when dependencies change', () => {
      const cell = createCell(5);
      const computation = vi.fn(({ get }) => get(cell) * 2);
      const computed = createComputed(computation);

      expect(get(computed)).toBe(10);
      expect(computation).toHaveBeenCalledTimes(1);

      set(cell, 7);
      expect(computation).toHaveBeenCalledTimes(2);
      expect(get(computed)).toBe(14);
      expect(computation).toHaveBeenCalledTimes(2);
    });
  });

  describe('compare option', () => {
    it('should use default Object.is comparison', () => {
      const cell = createCell(1);
      const onChange = vi.fn();
      const computed = createComputed(({ get }) => ({ value: get(cell) }), { onChange });

      const firstValue = get(computed);
      expect(onChange).not.toHaveBeenCalled();

      set(cell, 2);
      const secondValue = get(computed);
      expect(secondValue).not.toBe(firstValue); // Different objects
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ value: 1 }, { value: 2 });
    });

    it('should use custom compare function', () => {
      const cell = createCell(1);
      const onChange = vi.fn();
      const computed = createComputed(
        ({ get }) => ({ value: get(cell), timestamp: Date.now() }),
        {
          compare: (a, b) => a.value % 2 === b.value % 2,
          onChange,
        }
      );

      get(computed);
      expect(onChange).not.toHaveBeenCalled();

      // Same value, different timestamp - should not trigger onChange
      set(cell, 1);
      expect(onChange).not.toHaveBeenCalled();

      set(cell, 3);
      expect(onChange).not.toHaveBeenCalled();

      set(cell, 4);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('onChange callback', () => {
    it('should be called when computed value changes', () => {
      const cell = createCell(0);
      const onChange = vi.fn();
      const computed = createComputed(({ get }) => get(cell) + 1, { onChange });

      // Initial computation
      expect(get(computed)).toBe(1);
      expect(onChange).not.toHaveBeenCalled();

      // Value changes
      set(cell, 5);
      expect(get(computed)).toBe(6);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(1, 6);
    });

    it('should not be called when computed value stays the same', () => {
      const cellA = createCell(10);
      const cellB = createCell(10);
      const cellSwitch = createCell(true);
      const onChange = vi.fn();
      const computed = createComputed(({ get }) => {
        const useA = get(cellSwitch);
        return useA ? get(cellA) : get(cellB);
      }, { onChange });

      expect(get(computed)).toBe(10); // Initially uses cellA
      expect(onChange).not.toHaveBeenCalled();

      // Switch dependency from cellA to cellB, but value stays 10
      set(cellSwitch, false);
      expect(get(computed)).toBe(10); // Now uses cellB
      expect(onChange).not.toHaveBeenCalled(); // Value unchanged
      
      // Change unused cell - no effect
      set(cellA, 20);
      expect(get(computed)).toBe(10); // Still using cellB
      expect(onChange).not.toHaveBeenCalled();
      
      // Change used cell - triggers onChange
      set(cellB, 30);
      expect(get(computed)).toBe(30);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(10, 30);
    });
  });


  describe('error handling', () => {
    it('should propagate errors from computation', () => {
      const computed = createComputed(() => {
        throw new Error('Computation error');
      });

      expect(() => get(computed)).toThrow('Computation error');
    });

    it('should handle errors in dependent computeds', () => {
      const cell = createCell(3);
      const computed1 = createComputed(({ get }) => {
        const value = get(cell);
        if (value > 5) throw new Error('Value too large');
        return value;
      });
      const computed2 = createComputed(({ get }) => get(computed1) * 2);

      // Initially works
      expect(get(computed2)).toBe(6);

      // Error occurs during set and atomicUpdate rolls back
      expect(() => set(cell, 10)).toThrow('Value too large');
      
      // Values remain unchanged after failed set
      expect(get(cell)).toBe(3);
      expect(get(computed2)).toBe(6);
    });
  });
});