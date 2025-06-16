import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';
import type { Computed } from '../src';

describe('Dependency Tracking', () => {
  describe('Basic Dependencies', () => {
    it('should track Cell -> Computed dependency', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      expect(get(computed)).toBe(20);
      
      set(cell, 5);
      expect(get(computed)).toBe(10);
    });

    it('should track multiple Cells -> Computed dependencies', () => {
      const cellA = createCell(2);
      const cellB = createCell(3);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));
      
      expect(get(computed)).toBe(5);
      
      set(cellA, 10);
      expect(get(computed)).toBe(13);
      
      set(cellB, 20);
      expect(get(computed)).toBe(30);
    });
  });

  describe('Chained Dependencies', () => {
    it('should track Cell -> Computed -> Computed chain', () => {
      const cell = createCell(1);
      const computed1 = createComputed(({ get }) => get(cell) + 1);
      const computed2 = createComputed(({ get }) => get(computed1) * 2);
      
      expect(get(computed2)).toBe(4);
      
      set(cell, 5);
      expect(get(computed1)).toBe(6);
      expect(get(computed2)).toBe(12);
    });

    it('should handle complex dependency chains', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      
      const computedSum = createComputed(({ get }) => get(cellA) + get(cellB));
      const computedProduct = createComputed(({ get }) => get(cellA) * get(cellB));
      const computedFinal = createComputed(({ get }) => 
        get(computedSum) + get(computedProduct)
      );
      
      expect(get(computedFinal)).toBe(5); // (1+2) + (1*2) = 3 + 2 = 5
      
      set(cellA, 3);
      expect(get(computedSum)).toBe(5);     // 3 + 2 = 5
      expect(get(computedProduct)).toBe(6);  // 3 * 2 = 6
      expect(get(computedFinal)).toBe(11);   // 5 + 6 = 11
    });
  });

  describe('Dynamic Dependencies', () => {
    it('should update dependencies based on conditional logic', () => {
      const useA = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => 
        get(useA) ? get(cellA) : get(cellB)
      );
      
      expect(get(computed)).toBe(10);
      
      // Change value of unused cell - should not affect computed
      set(cellB, 30);
      expect(get(computed)).toBe(10);
      
      // Switch to use cellB
      set(useA, false);
      expect(get(computed)).toBe(30);
      
      // Now cellA changes should not affect computed
      set(cellA, 40);
      expect(get(computed)).toBe(30);
    });

    it('should handle dependencies that appear and disappear', () => {
      const count = createCell(0);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => {
        const n = get(count);
        if (n === 0) return 0;
        if (n === 1) return get(cellA);
        return get(cellA) + get(cellB);
      });
      
      expect(get(computed)).toBe(0);
      
      set(count, 1);
      expect(get(computed)).toBe(10);
      
      set(count, 2);
      expect(get(computed)).toBe(30);
      
      // Both cells should now affect the result
      set(cellA, 15);
      expect(get(computed)).toBe(35);
      
      set(cellB, 25);
      expect(get(computed)).toBe(40);
    });
  });

  describe('Circular Dependencies', () => {
    it('should detect direct circular dependencies', () => {
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      
      computedA = createComputed(({ get }) => get(computedB!) + 1);
      computedB = createComputed(({ get }) => get(computedA!) + 1);
      
      expect(() => get(computedA)).toThrow(/Circular dependency/);
    });

    it('should detect indirect circular dependencies', () => {
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      let computedC: Computed<number>;
      
      computedA = createComputed(({ get }) => get(computedC!) + 1);
      computedB = createComputed(({ get }) => get(computedA!) + 1);
      computedC = createComputed(({ get }) => get(computedB!) + 1);
      
      expect(() => get(computedA)).toThrow(/Circular dependency/);
    });

    it('should detect circular dependencies in atomicUpdate', () => {
      let computedA: Computed<number>;
      let computedB: Computed<number>;
      
      computedA = createComputed(({ get }) => get(computedB!) + 1);
      computedB = createComputed(({ get }) => get(computedA!) + 1);
      
      expect(() => {
        atomicUpdate((ops) => {
          ops.get(computedA);
        });
      }).toThrow(/Circular dependency/);
    });
  });

  describe('Dependency Updates in atomicUpdate', () => {
    it('should track dependencies correctly within atomicUpdate', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));
      
      atomicUpdate((ops) => {
        ops.set(cellA, 10);
        expect(ops.get(computed)).toBe(12); // 10 + 2
        
        ops.set(cellB, 20);
        expect(ops.get(computed)).toBe(30); // 10 + 20
      });
      
      expect(get(computed)).toBe(30);
    });

    it('should handle new computed created within atomicUpdate', () => {
      const cell = createCell(5);
      let computed: Computed<number> = null!;
      
      atomicUpdate((ops) => {
        computed = createComputed(({ get }) => get(cell) * 2);
        expect(ops.get(computed)).toBe(10);
        
        ops.set(cell, 3);
        expect(ops.get(computed)).toBe(6);
      });
      
      expect(get(computed)).toBe(6);
    });
  });

  describe('Lazy Initialization', () => {
    it('should not compute until first access', () => {
      let computeCount = 0;
      const cell = createCell(1);
      
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell) * 2;
      });
      
      expect(computeCount).toBe(0);
      
      const value = get(computed);
      expect(value).toBe(2);
      expect(computeCount).toBe(1);
    });

    it('should initialize with correct dependencies', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      let accessedCells: string[] = [];
      
      const computed = createComputed(({ get }) => {
        accessedCells = [];
        const a = get(cellA);
        accessedCells.push('A');
        if (a > 0) {
          const b = get(cellB);
          accessedCells.push('B');
          return a + b;
        }
        return a;
      });
      
      expect(accessedCells).toEqual([]);
      
      get(computed);
      expect(accessedCells).toEqual(['A', 'B']);
      
      // Change cellB should trigger recompute
      accessedCells = [];
      set(cellB, 10);
      get(computed);
      expect(accessedCells).toEqual(['A', 'B']);
    });
  });
});