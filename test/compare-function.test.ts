import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set } from '../src';

describe('Custom Compare Functions', () => {
  describe('Cell with custom compare', () => {
    it('should use custom compare for object values', () => {
      const cell = createCell(
        { id: 1, name: 'Alice' },
        {
          compare: (a, b) => a.id === b.id && a.name === b.name
        }
      );
      
      const originalVersion = cell.valueVersion;
      
      // Same values - should not trigger update
      set(cell, { id: 1, name: 'Alice' });
      expect(cell.valueVersion).toBe(originalVersion);
      
      // Different name - should trigger update
      set(cell, { id: 1, name: 'Bob' });
      expect(cell.valueVersion).toBe(originalVersion + 1);
      
      // Different id - should trigger update
      set(cell, { id: 2, name: 'Bob' });
      expect(cell.valueVersion).toBe(originalVersion + 2);
    });

    it('should use custom compare for array values', () => {
      const arrayEquals = (a: number[], b: number[]) => {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => val === b[idx]);
      };
      
      const cell = createCell([1, 2, 3], { compare: arrayEquals });
      const computed = createComputed(({ get }) => get(cell).length);
      
      expect(get(computed)).toBe(3);
      
      // Same array values - should not trigger update
      set(cell, [1, 2, 3]);
      expect(get(computed)).toBe(3);
      
      // Different array - should trigger update
      set(cell, [1, 2, 3, 4]);
      expect(get(computed)).toBe(4);
    });

    it('should propagate changes based on custom compare', () => {
      let computeCount = 0;
      const cell = createCell(
        { value: 10, metadata: 'ignore' },
        {
          compare: (a, b) => a.value === b.value // Only compare value field
        }
      );
      
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).value * 2;
      });
      
      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1);
      
      // Change metadata - should not trigger recomputation
      set(cell, { value: 10, metadata: 'changed' });
      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1); // No recomputation
      
      // Change value - should trigger recomputation
      set(cell, { value: 20, metadata: 'changed' });
      expect(get(computed)).toBe(40);
      expect(computeCount).toBe(2);
    });
  });

  describe('Computed with custom compare', () => {
    it('should use custom compare for computed values', () => {
      const cell = createCell({ x: 1, y: 2 });
      const onChange = vi.fn();
      
      const computed = createComputed(
        ({ get }) => {
          const { x, y } = get(cell);
          return { sum: x + y, product: x * y };
        },
        {
          compare: (a, b) => a.sum === b.sum, // Only care about sum
          onChange
        }
      );
      
      expect(get(computed)).toEqual({ sum: 3, product: 2 });
      expect(onChange).toHaveBeenCalledTimes(1);
      
      // Change values but keep sum the same
      set(cell, { x: 2, y: 1 });
      expect(get(computed)).toEqual({ sum: 3, product: 2 });
      expect(onChange).toHaveBeenCalledTimes(1); // No onChange because sum is same
      
      // Change values to different sum
      set(cell, { x: 2, y: 3 });
      expect(get(computed)).toEqual({ sum: 5, product: 6 });
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should not propagate when computed value is same according to compare', () => {
      let computeCount = 0;
      let dependentCount = 0;
      
      const cell = createCell(1);
      
      // Simple test case: compute rounded value
      const computed = createComputed(
        ({ get }) => {
          computeCount++;
          const value = get(cell);
          console.log(`computed: count=${computeCount}, cell=${value}, result=${Math.round(value / 10)}`);
          return Math.round(value / 10); // 0-4 -> 0, 5-14 -> 1, etc.
        },
        {
          compare: (a, b) => a === b // Simple number comparison
        }
      );
      
      const dependent = createComputed(({ get }) => {
        dependentCount++;
        const val = get(computed);
        console.log(`dependent: count=${dependentCount}, computed=${val}, result=${val * 100}`);
        return val * 100;
      });
      
      // Initial
      console.log('=== Initial get(dependent) ===');
      expect(get(dependent)).toBe(0); // round(1/10) * 100 = 0
      expect(computeCount).toBe(1);
      expect(dependentCount).toBe(1);
      
      // Change within same range
      console.log('\n=== set(cell, 4) ===');
      set(cell, 4);
      console.log('=== get(dependent) after set(4) ===');
      expect(get(dependent)).toBe(0); // round(4/10) * 100 = 0
      expect(computeCount).toBe(2);
      expect(dependentCount).toBe(1); // Should NOT recompute
      
      // Change to different range  
      console.log('\n=== set(cell, 10) ===');
      set(cell, 10);
      
      // Check computed first
      console.log('=== get(computed) after set(10) ===');
      const computedValue = get(computed);
      expect(computedValue).toBe(1); // round(10/10) = 1
      const countAfterComputed = computeCount;
      
      // Then check dependent
      console.log('=== get(dependent) after set(10) ===');
      const dependentValue = get(dependent);
      expect(dependentValue).toBe(100); // 1 * 100 = 100
      
      // Verify counts
      console.log(`\nFinal counts: computeCount=${computeCount}, dependentCount=${dependentCount}`);
      expect(countAfterComputed).toBe(3);
      expect(computeCount).toBe(countAfterComputed); // Should not have increased
      expect(dependentCount).toBe(2);
    });
  });

  describe('Compare function edge cases', () => {
    it('should handle exceptions in compare function', () => {
      const cell = createCell(
        { value: 1 },
        {
          compare: (a, b) => {
            if (b.value === 0) throw new Error('Cannot compare with zero');
            return a.value === b.value;
          }
        }
      );
      
      // Should not throw during normal comparison
      set(cell, { value: 1 });
      
      // Should propagate exception
      expect(() => set(cell, { value: 0 })).toThrow('Cannot compare with zero');
    });

    it('should handle NaN comparisons', () => {
      const cell = createCell(NaN);
      const computed = createComputed(({ get }) => get(cell));
      
      expect(get(computed)).toBeNaN();
      
      // NaN !== NaN, so this should trigger update with default compare
      set(cell, NaN);
      expect(get(computed)).toBeNaN();
    });

    it('should handle deep equality compare', () => {
      const deepEquals = (a: any, b: any): boolean => {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        return keysA.every(key => deepEquals(a[key], b[key]));
      };
      
      const cell = createCell(
        { user: { name: 'Alice', age: 30 }, scores: [10, 20, 30] },
        { compare: deepEquals }
      );
      
      const originalVersion = cell.valueVersion;
      
      // Same deep structure
      set(cell, { user: { name: 'Alice', age: 30 }, scores: [10, 20, 30] });
      expect(cell.valueVersion).toBe(originalVersion);
      
      // Different deep structure
      set(cell, { user: { name: 'Alice', age: 31 }, scores: [10, 20, 30] });
      expect(cell.valueVersion).toBe(originalVersion + 1);
    });
  });
});