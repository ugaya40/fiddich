import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';

describe('Version Tracking', () => {
  describe('valueVersion tracking', () => {
    it('should increment valueVersion only when value changes', () => {
      const cell = createCell(10);
      const originalVersion = cell.valueVersion;
      
      // Set same value
      set(cell, 10);
      expect(cell.valueVersion).toBe(originalVersion);
      
      // Set different value
      set(cell, 20);
      expect(cell.valueVersion).toBe(originalVersion + 1);
      
      // Set another different value
      set(cell, 30);
      expect(cell.valueVersion).toBe(originalVersion + 2);
    });

    it('should track valueVersion with custom compare', () => {
      const cell = createCell(
        { count: 0 },
        { 
          compare: (a, b) => a.count === b.count 
        }
      );
      const originalVersion = cell.valueVersion;
      
      // Same count, should not increment
      set(cell, { count: 0 });
      expect(cell.valueVersion).toBe(originalVersion);
      
      // Different count, should increment
      set(cell, { count: 1 });
      expect(cell.valueVersion).toBe(originalVersion + 1);
    });
  });

  describe('dependencyVersion tracking', () => {
    it('should track dependencyVersion when dependencies change', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const condition = createCell(true);
      
      const computed = createComputed(({ get }) => {
        if (get(condition)) {
          return get(cellA);
        } else {
          return get(cellB);
        }
      });
      
      // Initialize
      expect(get(computed)).toBe(1);
      const originalDepVersion = computed.dependencyVersion;
      
      // Change value of current dependency - should not change dependencyVersion
      set(cellA, 10);
      expect(get(computed)).toBe(10);
      expect(computed.dependencyVersion).toBe(originalDepVersion);
      
      // Change condition - this changes dependencies
      set(condition, false);
      expect(get(computed)).toBe(2);
      expect(computed.dependencyVersion).toBeGreaterThan(originalDepVersion);
    });

    it('should update dependencyVersion when adding dependencies', () => {
      const count = createCell(0);
      const cellA = createCell('A');
      const cellB = createCell('B');
      
      const computed = createComputed(({ get }) => {
        const n = get(count);
        if (n === 0) return 'none';
        if (n === 1) return get(cellA);
        return get(cellA) + get(cellB);
      });
      
      // No dependencies on cellA or cellB
      expect(get(computed)).toBe('none');
      const version1 = computed.dependencyVersion;
      
      // Add dependency on cellA
      set(count, 1);
      expect(get(computed)).toBe('A');
      const version2 = computed.dependencyVersion;
      expect(version2).toBeGreaterThan(version1);
      
      // Add dependency on cellB
      set(count, 2);
      expect(get(computed)).toBe('AB');
      const version3 = computed.dependencyVersion;
      expect(version3).toBeGreaterThan(version2);
    });

    it('should update dependencyVersion when removing dependencies', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => {
        if (get(condition)) {
          return get(cellA) + get(cellB);
        } else {
          return get(cellA);
        }
      });
      
      // Dependencies on condition, cellA, and cellB
      expect(get(computed)).toBe(30);
      const version1 = computed.dependencyVersion;
      
      // Remove dependency on cellB
      set(condition, false);
      expect(get(computed)).toBe(10);
      const version2 = computed.dependencyVersion;
      expect(version2).toBeGreaterThan(version1);
    });
  });

  describe('Version tracking in atomicUpdate', () => {
    it('should batch version updates in atomicUpdate', () => {
      const cell1 = createCell(1);
      const cell2 = createCell(2);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));
      
      const originalVersion1 = cell1.valueVersion;
      const originalVersion2 = cell2.valueVersion;
      
      atomicUpdate((ops) => {
        ops.set(cell1, 10);
        ops.set(cell2, 20);
        
        // Versions should NOT be updated within atomicUpdate (updated at commit)
        expect(cell1.valueVersion).toBe(originalVersion1);
        expect(cell2.valueVersion).toBe(originalVersion2);
      });
      
      // Versions are updated after commit
      expect(cell1.valueVersion).toBe(originalVersion1 + 1);
      expect(cell2.valueVersion).toBe(originalVersion2 + 1);
    });

    it('should handle concurrent atomicUpdate version conflicts', () => {
      const cell = createCell(0);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Initialize
      expect(get(computed)).toBe(0);
      
      // Start two concurrent atomicUpdates
      const promise1 = atomicUpdate(async (ops) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        ops.set(cell, 1);
        expect(ops.get(computed)).toBe(2);
      });
      
      const promise2 = atomicUpdate(async (ops) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        ops.set(cell, 2);
        expect(ops.get(computed)).toBe(4);
      });
      
      // Both should complete successfully due to optimistic concurrency
      return Promise.all([promise1, promise2]).then(() => {
        // One of them wins (depends on timing)
        const finalValue = get(cell);
        expect([1, 2]).toContain(finalValue);
        expect(get(computed)).toBe(finalValue * 2);
      });
    });
  });

  describe('Version tracking with nested computeds', () => {
    it('should track versions through computed chains', () => {
      const cell = createCell(1);
      const computed1 = createComputed(({ get }) => get(cell) + 1);
      const computed2 = createComputed(({ get }) => get(computed1) * 2);
      const computed3 = createComputed(({ get }) => get(computed2) + get(computed1));
      
      // Initialize all
      expect(get(computed3)).toBe(6); // (2 * 2) + 2
      
      const depVersion1 = computed1.dependencyVersion;
      const depVersion2 = computed2.dependencyVersion;
      const depVersion3 = computed3.dependencyVersion;
      
      // Change the root cell
      set(cell, 2);
      expect(get(computed3)).toBe(9); // (3 * 2) + 3
      
      // All dependency versions should remain the same (dependencies didn't change)
      expect(computed1.dependencyVersion).toBe(depVersion1);
      expect(computed2.dependencyVersion).toBe(depVersion2);
      expect(computed3.dependencyVersion).toBe(depVersion3);
    });
  });
});