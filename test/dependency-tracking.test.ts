import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';
import type { Computed } from '../src';

describe('Dependency Tracking', () => {
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

    it('should detect self-referencing computed', () => {
      let computed: Computed<number>;
      
      computed = createComputed(({ get }) => get(computed!) + 1);
      
      expect(() => get(computed)).toThrow(/Circular dependency/);
    });
  });

  describe('Dynamic Dependencies', () => {
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

  describe('Complex Dependency Patterns', () => {
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

    it('should initialize with correct dependencies in complex scenarios', () => {
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
  });
});