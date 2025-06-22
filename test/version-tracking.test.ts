import { describe, expect, it } from 'vitest';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';

describe('Checkpoint Tracking', () => {
  describe('valueCheckpoint tracking', () => {
    it('should increment valueCheckpoint only when value changes', () => {
      const cell = createCell(10);
      const originalVersion = cell.valueCheckpoint;

      // Set same value
      set(cell, 10);
      expect(cell.valueCheckpoint).toBe(originalVersion);

      // Set different value
      set(cell, 20);
      expect(cell.valueCheckpoint).toBe(originalVersion + 1);

      // Set another different value
      set(cell, 30);
      expect(cell.valueCheckpoint).toBe(originalVersion + 2);
    });

    it('should track valueCheckpoint with custom compare', () => {
      const cell = createCell(
        { count: 0 },
        {
          compare: (a, b) => a.count === b.count,
        }
      );
      const originalVersion = cell.valueCheckpoint;

      // Same count, should not increment
      set(cell, { count: 0 });
      expect(cell.valueCheckpoint).toBe(originalVersion);

      // Different count, should increment
      set(cell, { count: 1 });
      expect(cell.valueCheckpoint).toBe(originalVersion + 1);
    });
  });

  describe('Computed valueCheckpoint tracking', () => {
    it('should track valueCheckpoint when computed value changes', () => {
      const cell = createCell(1);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Initialize
      expect(get(computed)).toBe(2);
      const originalValueCheckpoint = computed.valueCheckpoint;
      
      // Change dependency value - computed value changes
      set(cell, 5);
      expect(get(computed)).toBe(10);
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint);
    });
    
    it('should NOT change valueCheckpoint when computed value stays same', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => Math.floor(get(cell) / 10));
      
      // Initialize
      expect(get(computed)).toBe(0); // floor(5/10) = 0
      const originalValueCheckpoint = computed.valueCheckpoint;
      
      // Change within same range
      set(cell, 9);
      expect(get(computed)).toBe(0); // floor(9/10) = 0
      expect(computed.valueCheckpoint).toBe(originalValueCheckpoint); // Value didn't change
      
      // Change to different range
      set(cell, 15);
      expect(get(computed)).toBe(1); // floor(15/10) = 1
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint);
    });
    
    it('should respect custom compare for valueCheckpoint tracking', () => {
      const cell = createCell({ x: 1, y: 2 });
      const computed = createComputed(
        ({ get }) => {
          const { x, y } = get(cell);
          return { sum: x + y, product: x * y };
        },
        {
          compare: (a, b) => a.sum === b.sum // Only care about sum
        }
      );
      
      // Initialize
      expect(get(computed)).toEqual({ sum: 3, product: 2 });
      const originalValueCheckpoint = computed.valueCheckpoint;
      
      // Change but keep sum same
      set(cell, { x: 2, y: 1 });
      expect(get(computed)).toEqual({ sum: 3, product: 2 });
      expect(computed.valueCheckpoint).toBe(originalValueCheckpoint); // Same per compare
      
      // Change sum
      set(cell, { x: 2, y: 3 });
      expect(get(computed)).toEqual({ sum: 5, product: 6 });
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint);
    });
  });

  describe('dependencyCheckpoint tracking', () => {
    it('should track dependencyCheckpoint when dependencies change', () => {
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
      const originalDepVersion = computed.dependencyCheckpoint;
      const originalValueCheckpoint = computed.valueCheckpoint;

      // Change value of current dependency - should not change dependencyVersion
      set(cellA, 10);
      expect(get(computed)).toBe(10);
      expect(computed.dependencyCheckpoint).toBe(originalDepVersion);
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint); // Value changed

      // Change condition - this changes dependencies
      set(condition, false);
      expect(get(computed)).toBe(2);
      expect(computed.dependencyCheckpoint).toBeGreaterThan(originalDepVersion);
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint); // Value also changed (1 -> 2)
    });

    it('should update dependencyCheckpoint when adding dependencies', () => {
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
      const version1 = computed.dependencyCheckpoint;
      const valueCheckpoint1 = computed.valueCheckpoint;

      // Add dependency on cellA
      set(count, 1);
      expect(get(computed)).toBe('A');
      const version2 = computed.dependencyCheckpoint;
      expect(version2).toBeGreaterThan(version1);
      const valueCheckpoint2 = computed.valueCheckpoint;
      expect(valueCheckpoint2).toBeGreaterThan(valueCheckpoint1); // Value changed 'none' -> 'A'

      // Add dependency on cellB
      set(count, 2);
      expect(get(computed)).toBe('AB');
      const version3 = computed.dependencyCheckpoint;
      expect(version3).toBeGreaterThan(version2);
      const valueCheckpoint3 = computed.valueCheckpoint;
      expect(valueCheckpoint3).toBeGreaterThan(valueCheckpoint2); // Value changed 'A' -> 'AB'
    });

    it('should update dependencyCheckpoint when removing dependencies', () => {
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
      const version1 = computed.dependencyCheckpoint;
      const valueCheckpoint1 = computed.valueCheckpoint;

      // Remove dependency on cellB
      set(condition, false);
      expect(get(computed)).toBe(10);
      const version2 = computed.dependencyCheckpoint;
      expect(version2).toBeGreaterThan(version1);
      const valueCheckpoint2 = computed.valueCheckpoint;
      expect(valueCheckpoint2).toBeGreaterThan(valueCheckpoint1); // Value changed 30 -> 10
    });
  });

  describe('valueCheckpoint and dependencyCheckpoint independence', () => {
    it('should not change both checkpoints when dependency value changes but computed value stays same', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) > 10 ? 'high' : 'low');
      
      // Initialize
      expect(get(computed)).toBe('low');
      const originalValueCheckpoint = computed.valueCheckpoint;
      const originalDepCheckpoint = computed.dependencyCheckpoint;
      
      // Change cell value but computed result stays same
      set(cell, 8);
      expect(get(computed)).toBe('low');
      expect(computed.valueCheckpoint).toBe(originalValueCheckpoint); // Value didn't change
      expect(computed.dependencyCheckpoint).toBe(originalDepCheckpoint); // Dependencies didn't change
      
      // Change to trigger different result
      set(cell, 15);
      expect(get(computed)).toBe('high');
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint); // Value changed
      expect(computed.dependencyCheckpoint).toBe(originalDepCheckpoint); // Dependencies still same
    });
    
    it('should change only dependencyCheckpoint when dependencies change but value stays same', () => {
      const toggle = createCell(true);
      const cellA = createCell(5);
      const cellB = createCell(5); // Same value as cellA
      
      const computed = createComputed(({ get }) => {
        return get(toggle) ? get(cellA) : get(cellB);
      });
      
      // Initialize
      expect(get(computed)).toBe(5);
      const originalValueCheckpoint = computed.valueCheckpoint;
      const originalDepCheckpoint = computed.dependencyCheckpoint;
      
      // Switch dependencies but value stays same
      set(toggle, false);
      expect(get(computed)).toBe(5); // Same value
      expect(computed.valueCheckpoint).toBe(originalValueCheckpoint); // Value didn't change
      expect(computed.dependencyCheckpoint).toBeGreaterThan(originalDepCheckpoint); // Dependencies changed
    });
    
    it('should change both checkpoints when dependencies and value both change', () => {
      const toggle = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => {
        return get(toggle) ? get(cellA) : get(cellB);
      });
      
      // Initialize
      expect(get(computed)).toBe(10);
      const originalValueCheckpoint = computed.valueCheckpoint;
      const originalDepCheckpoint = computed.dependencyCheckpoint;
      
      // Switch dependencies and value changes too
      set(toggle, false);
      expect(get(computed)).toBe(20); // Different value
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint); // Value changed
      expect(computed.dependencyCheckpoint).toBeGreaterThan(originalDepCheckpoint); // Dependencies changed
    });
    
    it('should change only valueCheckpoint when same dependencies produce different value', () => {
      const cell = createCell(1);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Initialize
      expect(get(computed)).toBe(2);
      const originalValueCheckpoint = computed.valueCheckpoint;
      const originalDepCheckpoint = computed.dependencyCheckpoint;
      
      // Change cell value
      set(cell, 5);
      expect(get(computed)).toBe(10);
      expect(computed.valueCheckpoint).toBeGreaterThan(originalValueCheckpoint); // Value changed
      expect(computed.dependencyCheckpoint).toBe(originalDepCheckpoint); // Dependencies didn't change
    });
  });

  describe('Checkpoint tracking in atomicUpdate', () => {
    it('should batch checkpoint updates in atomicUpdate', () => {
      const cell1 = createCell(1);
      const cell2 = createCell(2);

      const originalVersion1 = cell1.valueCheckpoint;
      const originalVersion2 = cell2.valueCheckpoint;

      atomicUpdate((ops) => {
        ops.set(cell1, 10);
        ops.set(cell2, 20);

        // Versions should NOT be updated within atomicUpdate (updated at commit)
        expect(cell1.valueCheckpoint).toBe(originalVersion1);
        expect(cell2.valueCheckpoint).toBe(originalVersion2);
      });

      // Versions are updated after commit
      expect(cell1.valueCheckpoint).toBeGreaterThan(originalVersion1);
      expect(cell2.valueCheckpoint).toBeGreaterThan(originalVersion2);
    });

    it('should handle concurrent atomicUpdate checkpoint conflicts', async () => {
      const cell = createCell(0);
      const computed = createComputed(({ get }) => get(cell) * 2);

      // Initialize
      expect(get(computed)).toBe(0);

      // Start two concurrent atomicUpdates
      const promise1 = atomicUpdate(async (ops) => {
        ops.set(cell, 1); // Create copy immediately
        expect(ops.get(computed)).toBe(2);
        await new Promise((resolve) => setTimeout(resolve, 10));
        // By this time, promise2 will have committed
      });

      const promise2 = atomicUpdate(async (ops) => {
        ops.set(cell, 2); // Create copy immediately
        expect(ops.get(computed)).toBe(4);
        await new Promise((resolve) => setTimeout(resolve, 5));
        // This will commit first
      });

      // One should succeed, one should fail due to concurrent modification
      const results = await Promise.allSettled([promise1, promise2]);
      
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      
      if (failures[0].status === 'rejected') {
        expect(failures[0].reason.message).toMatch(/Concurrent value modification detected/);
      }
      
      // The cell should have one of the values
      const finalValue = get(cell);
      expect([1, 2]).toContain(finalValue);
      expect(get(computed)).toBe(finalValue * 2);
    });
  });

  describe('Checkpoint tracking with nested computeds', () => {
    it('should track checkpoints through computed chains', () => {
      const cell = createCell(1);
      const computed1 = createComputed(({ get }) => get(cell) + 1);
      const computed2 = createComputed(({ get }) => get(computed1) * 2);
      const computed3 = createComputed(({ get }) => get(computed2) + get(computed1));

      // Initialize all
      expect(get(computed3)).toBe(6); // (2 * 2) + 2

      const depVersion1 = computed1.dependencyCheckpoint;
      const depVersion2 = computed2.dependencyCheckpoint;
      const depVersion3 = computed3.dependencyCheckpoint;
      const valCheckpoint1 = computed1.valueCheckpoint;
      const valCheckpoint2 = computed2.valueCheckpoint;
      const valCheckpoint3 = computed3.valueCheckpoint;

      // Change the root cell
      set(cell, 2);
      expect(get(computed3)).toBe(9); // (3 * 2) + 3

      // All dependency versions should remain the same (dependencies didn't change)
      expect(computed1.dependencyCheckpoint).toBe(depVersion1);
      expect(computed2.dependencyCheckpoint).toBe(depVersion2);
      expect(computed3.dependencyCheckpoint).toBe(depVersion3);
      
      // But value checkpoints should increase (values changed)
      expect(computed1.valueCheckpoint).toBeGreaterThan(valCheckpoint1); // 2 -> 3
      expect(computed2.valueCheckpoint).toBeGreaterThan(valCheckpoint2); // 4 -> 6
      expect(computed3.valueCheckpoint).toBeGreaterThan(valCheckpoint3); // 6 -> 9
    });
  });
});
