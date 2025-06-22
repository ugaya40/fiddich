import { describe, expect, it } from 'vitest';
import { createCell, createComputed, get, set } from '../src';

describe('Basic get/set operations', () => {
  describe('Cell operations', () => {
    it('should create a cell and get its value', () => {
      const cell = createCell(10);
      expect(get(cell)).toBe(10);
    });

    it('should update cell value with set', () => {
      const cell = createCell(10);
      set(cell, 20);
      expect(get(cell)).toBe(20);
    });

    it('should handle multiple cells independently', () => {
      const cell1 = createCell(10);
      const cell2 = createCell('hello');
      const cell3 = createCell(true);

      expect(get(cell1)).toBe(10);
      expect(get(cell2)).toBe('hello');
      expect(get(cell3)).toBe(true);

      set(cell1, 20);
      set(cell2, 'world');
      set(cell3, false);

      expect(get(cell1)).toBe(20);
      expect(get(cell2)).toBe('world');
      expect(get(cell3)).toBe(false);
    });

    it('should not trigger update when setting same value', () => {
      const cell = createCell(10);
      const originalVersion = cell.valueCheckpoint;

      set(cell, 10); // Same value
      expect(cell.valueCheckpoint).toBe(originalVersion);
    });

    it('should increment version when value changes', () => {
      const cell = createCell(10);
      const originalVersion = cell.valueCheckpoint;

      set(cell, 20);
      expect(cell.valueCheckpoint).toBe(originalVersion + 1);
    });
  });

  describe('Computed operations', () => {
    it('should create computed and derive value', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(get(computed)).toBe(20);
    });

    it('should update computed when dependency changes', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(get(computed)).toBe(20);

      set(cell, 15);
      expect(get(computed)).toBe(30);
    });

    it('should handle multiple dependencies', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));

      expect(get(computed)).toBe(30);

      set(cell1, 15);
      expect(get(computed)).toBe(35);

      set(cell2, 25);
      expect(get(computed)).toBe(40);
    });

    it('should handle nested computed', () => {
      const cell = createCell(10);
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      const computed2 = createComputed(({ get }) => get(computed1) + 5);

      expect(get(computed2)).toBe(25);

      set(cell, 20);
      expect(get(computed1)).toBe(40);
      expect(get(computed2)).toBe(45);
    });
  });

  describe('Complex dependency scenarios', () => {
    it('should handle diamond dependency pattern', () => {
      const root = createCell(10);
      const left = createComputed(({ get }) => get(root) * 2);
      const right = createComputed(({ get }) => get(root) * 3);
      const bottom = createComputed(({ get }) => get(left) + get(right));

      expect(get(bottom)).toBe(50); // 20 + 30

      set(root, 20);
      expect(get(bottom)).toBe(100); // 40 + 60
    });

    it('should handle conditional dependencies', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      const computed = createComputed(({ get }) => (get(condition) ? get(cellA) : get(cellB)));

      expect(get(computed)).toBe(10);

      set(condition, false);
      expect(get(computed)).toBe(20);

      // Should not affect computed when cellA changes (not a dependency anymore)
      set(cellA, 100);
      expect(get(computed)).toBe(20);

      // Should affect when cellB changes
      set(cellB, 30);
      expect(get(computed)).toBe(30);
    });
  });
});
