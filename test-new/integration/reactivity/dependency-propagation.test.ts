import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../../../src';

describe('dependency-propagation', () => {
  describe('basic dependency relationships', () => {
    it('should propagate changes from Cell to Computed', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(get(computed)).toBe(20);

      set(cell, 15);
      expect(get(computed)).toBe(30);

      set(cell, 0);
      expect(get(computed)).toBe(0);
    });

    it('should propagate changes from Cell to multiple Computeds', () => {
      const cell = createCell(5);
      const double = createComputed(({ get }) => get(cell) * 2);
      const triple = createComputed(({ get }) => get(cell) * 3);
      const square = createComputed(({ get }) => get(cell) * get(cell));

      expect(get(double)).toBe(10);
      expect(get(triple)).toBe(15);
      expect(get(square)).toBe(25);

      set(cell, 10);
      
      expect(get(double)).toBe(20);
      expect(get(triple)).toBe(30);
      expect(get(square)).toBe(100);
    });

    it('should handle computed depending on multiple cells', () => {
      const cellA = createCell(10);
      const cellB = createCell(20);
      const cellC = createCell(30);
      
      let computeCount = 0;
      const sum = createComputed(({ get }) => {
        computeCount++;
        return get(cellA) + get(cellB) + get(cellC);
      });
      
      // Initial computation on first get
      expect(computeCount).toBe(0);
      expect(get(sum)).toBe(60);
      expect(computeCount).toBe(1);

      // Change cellA - computed is recalculated on set
      set(cellA, 15);
      expect(computeCount).toBe(2);
      expect(get(sum)).toBe(65);

      // Change cellB - computed is recalculated on set
      set(cellB, 25);
      expect(computeCount).toBe(3);
      expect(get(sum)).toBe(70);

      // Change cellC - computed is recalculated on set
      set(cellC, 35);
      expect(computeCount).toBe(4);
      expect(get(sum)).toBe(75);

      // Change multiple cells in atomicUpdate - computed is recalculated once after commit
      atomicUpdate(({ set }) => {
        set(cellA, 100);
        set(cellB, 200);
        set(cellC, 300);
      });
      expect(computeCount).toBe(5);
      expect(get(sum)).toBe(600);
    });
  });

  describe('chained dependency relationships', () => {
    it('should propagate through chain of computeds', () => {
      // A → B → C → D
      const cellA = createCell(1);
      const computedB = createComputed(({ get }) => get(cellA) + 1);
      const computedC = createComputed(({ get }) => get(computedB) * 2);
      const computedD = createComputed(({ get }) => get(computedC) + 10);

      expect(get(computedD)).toBe(14); // ((1 + 1) * 2) + 10

      set(cellA, 5);
      expect(get(computedB)).toBe(6);
      expect(get(computedC)).toBe(12);
      expect(get(computedD)).toBe(22); // ((5 + 1) * 2) + 10
    });

    it('should handle branching dependency chains', () => {
      // A → B, A → C, B → D, C → E
      const cellA = createCell(10);
      const computedB = createComputed(({ get }) => get(cellA) * 2);
      const computedC = createComputed(({ get }) => get(cellA) + 5);
      const computedD = createComputed(({ get }) => get(computedB) - 3);
      const computedE = createComputed(({ get }) => get(computedC) / 5);

      expect(get(computedB)).toBe(20);
      expect(get(computedC)).toBe(15);
      expect(get(computedD)).toBe(17);
      expect(get(computedE)).toBe(3);

      set(cellA, 20);
      
      expect(get(computedB)).toBe(40);
      expect(get(computedC)).toBe(25);
      expect(get(computedD)).toBe(37);
      expect(get(computedE)).toBe(5);
    });

    it('should update all affected computeds in correct order', () => {
      // Deep dependency chain to test rank-based ordering
      const cell = createCell(1);
      const updateOrder: string[] = [];
      
      const level1 = createComputed(({ get }) => get(cell) + 1, {
        onChange: () => updateOrder.push('level1')
      });
      
      const level2a = createComputed(({ get }) => get(level1) * 2, {
        onChange: () => updateOrder.push('level2a')
      });
      
      const level2b = createComputed(({ get }) => get(level1) + 10, {
        onChange: () => updateOrder.push('level2b')
      });
      
      const level3 = createComputed(({ get }) => get(level2a) + get(level2b), {
        onChange: () => updateOrder.push('level3')
      });
      
      const level4 = createComputed(({ get }) => get(level3) * 2, {
        onChange: () => updateOrder.push('level4')
      });

      // Initial computation to initialize all computeds
      expect(get(level4)).toBe(32); // ((1 + 1) * 2 + (1 + 1) + 10) * 2 = (4 + 12) * 2 = 32
      updateOrder.length = 0; // Clear initial computation

      // Update and verify order
      set(cell, 2);

      // Verify updates happened in correct rank order
      expect(updateOrder).toEqual(['level1', 'level2a', 'level2b', 'level3', 'level4']);
      
      // Also verify final values are correct
      expect(get(level1)).toBe(3);
      expect(get(level2a)).toBe(6);
      expect(get(level2b)).toBe(13);
      expect(get(level3)).toBe(19);
      expect(get(level4)).toBe(38);
    });
  });

  describe('diamond dependencies', () => {
    it('should compute diamond dependency only once', () => {
      // A → B, A → C, B → D, C → D
      const cellA = createCell(10);
      let computeBCount = 0;
      let computeCCount = 0;
      let computeDCount = 0;

      const computedB = createComputed(({ get }) => {
        computeBCount++;
        return get(cellA) * 2;
      });

      const computedC = createComputed(({ get }) => {
        computeCCount++;
        return get(cellA) + 5;
      });

      const computedD = createComputed(({ get }) => {
        computeDCount++;
        return get(computedB) + get(computedC);
      });

      // Initial computation
      expect(get(computedD)).toBe(35); // (10 * 2) + (10 + 5)
      expect(computeBCount).toBe(1);
      expect(computeCCount).toBe(1);
      expect(computeDCount).toBe(1);

      // Update A
      set(cellA, 20);
      expect(get(computedD)).toBe(65); // (20 * 2) + (20 + 5)
      
      // Each computed should be calculated exactly once more
      expect(computeBCount).toBe(2);
      expect(computeCCount).toBe(2);
      expect(computeDCount).toBe(2);
    });

    it('should handle complex diamond patterns', () => {
      // Multiple diamonds: A → B,C → D,E → F
      const cellA = createCell(1);
      let bCount = 0, cCount = 0, dCount = 0, eCount = 0, fCount = 0;
      
      const computedB = createComputed(({ get }) => get(cellA) * 2, {
        onChange: () => bCount++
      });
      
      const computedC = createComputed(({ get }) => get(cellA) * 3, {
        onChange: () => cCount++
      });
      
      const computedD = createComputed(({ get }) => get(computedB) + get(computedC), {
        onChange: () => dCount++
      });
      
      const computedE = createComputed(({ get }) => get(computedB) * get(computedC), {
        onChange: () => eCount++
      });
      
      const computedF = createComputed(({ get }) => get(computedD) + get(computedE), {
        onChange: () => fCount++
      });

      // Initial computation
      expect(get(computedF)).toBe(11); // (2 + 3) + (2 * 3)

      // First update
      set(cellA, 2);
      expect(get(computedF)).toBe(34); // (4 + 6) + (4 * 6)
      
      // Each computed should be updated exactly once
      expect(bCount).toBe(1);
      expect(cCount).toBe(1);
      expect(dCount).toBe(1);
      expect(eCount).toBe(1);
      expect(fCount).toBe(1);

      // Second update
      set(cellA, 3);
      expect(get(computedF)).toBe(69); // (6 + 9) + (6 * 9) = 15 + 54 = 69
      
      // Each computed should be updated exactly once more
      expect(bCount).toBe(2);
      expect(cCount).toBe(2);
      expect(dCount).toBe(2);
      expect(eCount).toBe(2);
      expect(fCount).toBe(2);
    });

    it('should maintain correct values through diamond updates', () => {
      // Diamond with different computation paths
      const base = createCell(100);
      
      const pathA = createComputed(({ get }) => {
        const value = get(base);
        return value > 50 ? value * 0.9 : value * 1.1;
      });
      
      const pathB = createComputed(({ get }) => {
        const value = get(base);
        return value > 50 ? value - 10 : value + 10;
      });
      
      const result = createComputed(({ get }) => {
        return Math.round(get(pathA) + get(pathB));
      });

      // Initial: base > 50
      expect(get(result)).toBe(180); // (100 * 0.9) + (100 - 10)

      // Update to value <= 50
      set(base, 40);
      expect(get(result)).toBe(94); // (40 * 1.1) + (40 + 10)

      // Update back to > 50
      set(base, 80);
      expect(get(result)).toBe(142); // (80 * 0.9) + (80 - 10)

      // Multiple updates in atomicUpdate
      atomicUpdate(({ get, set }) => {
        set(base, 30);
        expect(get(result)).toBe(73); // (30 * 1.1) + (30 + 10)
        
        set(base, 120);
        expect(get(result)).toBe(218); // (120 * 0.9) + (120 - 10)
      });

      expect(get(result)).toBe(218);
    });
  });
});