import { describe, expect, it } from 'vitest';
import type { StateGetter } from '../src';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';

describe('Minimal Computation', () => {
  describe('Diamond dependency pattern', () => {
    it('should compute each node only once in diamond pattern', () => {
      let leftCount = 0;
      let rightCount = 0;
      let bottomCount = 0;

      const root = createCell(10);

      const left = createComputed(({ get }) => {
        leftCount++;
        return get(root) * 2;
      });

      const right = createComputed(({ get }) => {
        rightCount++;
        return get(root) * 3;
      });

      const bottom = createComputed(({ get }) => {
        bottomCount++;
        return get(left) + get(right);
      });

      // Initial computation
      expect(get(bottom)).toBe(50); // 20 + 30
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(bottomCount).toBe(1);

      // Update root
      set(root, 20);
      expect(get(bottom)).toBe(100); // 40 + 60

      // Each computed should be calculated exactly once more
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2);
    });

    it('should handle multiple diamond patterns', () => {
      const computeCounts: Record<string, number> = {};

      const createTrackedComputed = <T>(name: string, fn: (get: StateGetter) => T) => {
        computeCounts[name] = 0;
        return createComputed(({ get }) => {
          computeCounts[name]++;
          return fn(get);
        });
      };

      const a = createCell(1);
      const b = createTrackedComputed('b', (get) => get(a) * 2);
      const c = createTrackedComputed('c', (get) => get(a) * 3);
      const d = createTrackedComputed('d', (get) => get(b) + get(c));
      const e = createTrackedComputed('e', (get) => get(b) * get(c));
      const f = createTrackedComputed('f', (get) => get(d) + get(e));

      // Initial
      expect(get(f)).toBe(11); // (2 + 3) + (2 * 3) = 5 + 6
      expect(computeCounts).toEqual({ b: 1, c: 1, d: 1, e: 1, f: 1 });

      // Update
      set(a, 2);
      expect(get(f)).toBe(34); // (4 + 6) + (4 * 6) = 10 + 24

      // Each should be computed exactly once
      expect(computeCounts).toEqual({ b: 2, c: 2, d: 2, e: 2, f: 2 });
    });
  });

  describe('Propagation stopping', () => {
    it('should stop propagation when computed value does not change', () => {
      let computeCount = 0;
      let dependentCount = 0;

      const cell = createCell(1.4);

      const computed = createComputed(({ get }) => {
        computeCount++;
        return Math.floor(get(cell));
      });

      const dependent = createComputed(({ get }) => {
        dependentCount++;
        return get(computed) * 100;
      });

      // Initial
      expect(get(dependent)).toBe(100);
      expect(computeCount).toBe(1);
      expect(dependentCount).toBe(1);

      // Change within same floor
      set(cell, 1.7);
      expect(get(dependent)).toBe(100);
      expect(computeCount).toBe(2); // Computed runs
      expect(dependentCount).toBe(1); // But dependent doesn't

      // Change to different floor
      set(cell, 2.1);
      expect(get(dependent)).toBe(200);
      expect(computeCount).toBe(3);
      expect(dependentCount).toBe(2);
    });

    it('should handle complex propagation stopping chains', () => {
      const counts: Record<string, number> = {};

      const createTracked = <T>(name: string, fn: (get: StateGetter) => T) => {
        counts[name] = 0;
        return createComputed(({ get }) => {
          counts[name]++;
          return fn(get);
        });
      };

      const input = createCell(15);

      // Divides by 10 and floors: 15 -> 1, 25 -> 2
      const level1 = createTracked('level1', (get) => Math.floor(get(input) / 10));

      // Unchanged when level1 is same
      const level2 = createTracked('level2', (get) => get(level1) * 100);

      // Should not recompute when level2 unchanged
      const level3 = createTracked('level3', (get) => `Value: ${get(level2)}`);

      // Initial
      expect(get(level3)).toBe('Value: 100');
      expect(counts).toEqual({ level1: 1, level2: 1, level3: 1 });

      // Change within same range
      set(input, 17);
      expect(get(level3)).toBe('Value: 100');
      expect(counts).toEqual({ level1: 2, level2: 1, level3: 1 });

      // Change to different range
      set(input, 25);
      expect(get(level3)).toBe('Value: 200');
      expect(counts).toEqual({ level1: 3, level2: 2, level3: 2 });
    });
  });

  describe('Conditional dependencies', () => {
    it('should not recompute branches not taken', () => {
      let leftCount = 0;
      let rightCount = 0;
      let resultCount = 0;

      const condition = createCell(true);
      const leftValue = createCell(10);
      const rightValue = createCell(20);

      const leftBranch = createComputed(({ get }) => {
        leftCount++;
        return get(leftValue) * 2;
      });

      const rightBranch = createComputed(({ get }) => {
        rightCount++;
        return get(rightValue) * 3;
      });

      const result = createComputed(({ get }) => {
        resultCount++;
        return get(condition) ? get(leftBranch) : get(rightBranch);
      });

      // Initial - only left branch computed
      expect(get(result)).toBe(20);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(0);
      expect(resultCount).toBe(1);

      // Change right value - should not trigger any computation
      set(rightValue, 30);
      expect(get(result)).toBe(20);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(0);
      expect(resultCount).toBe(1);

      // Switch condition
      set(condition, false);
      expect(get(result)).toBe(90); // 30 * 3
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(resultCount).toBe(2);

      // Left changes affect leftBranch but not result
      set(leftValue, 50);
      expect(get(result)).toBe(90);
      expect(leftCount).toBe(2); // leftBranch IS recomputed to maintain consistency
      expect(rightCount).toBe(1);
      expect(resultCount).toBe(2); // result is not recomputed

      // Verify leftBranch has correct value if accessed directly
      expect(get(leftBranch)).toBe(100); // 50 * 2
    });
  });

  describe('Batch updates', () => {
    it('should compute each dependent only once in atomicUpdate', () => {
      let computeCount = 0;

      const a = createCell(1);
      const b = createCell(2);
      const c = createCell(3);

      const sum = createComputed(({ get }) => {
        computeCount++;
        return get(a) + get(b) + get(c);
      });

      // Initial
      expect(get(sum)).toBe(6);
      expect(computeCount).toBe(1);

      // Update all three in atomicUpdate
      atomicUpdate(({ set }) => {
        set(a, 10);
        set(b, 20);
        set(c, 30);
      });

      // Should compute only once despite three changes
      expect(get(sum)).toBe(60);
      expect(computeCount).toBe(2);
    });

    it('should handle complex batch updates efficiently', () => {
      const counts: Record<string, number> = {};

      const createTracked = <T>(name: string, fn: (get: StateGetter) => T) => {
        counts[name] = 0;
        return createComputed(({ get }) => {
          counts[name]++;
          return fn(get);
        });
      };

      const cells = Array.from({ length: 5 }, (_, i) => createCell(i));

      // Each intermediate depends on multiple cells
      const intermediate1 = createTracked('int1', (get) => get(cells[0]) + get(cells[1]));
      const intermediate2 = createTracked('int2', (get) => get(cells[2]) + get(cells[3]) + get(cells[4]));

      // Final depends on both intermediates
      const final = createTracked('final', (get) => get(intermediate1) * get(intermediate2));

      // Initial
      expect(get(final)).toBe(9); // (0+1) * (2+3+4) = 1 * 9
      expect(counts).toEqual({ int1: 1, int2: 1, final: 1 });

      // Update all cells
      atomicUpdate(({ set }) => {
        cells.forEach((cell, i) => set(cell, i * 10));
      });

      expect(get(final)).toBe(900); // (0+10) * (20+30+40) = 10 * 90
      expect(counts).toEqual({ int1: 2, int2: 2, final: 2 });
    });
  });

  describe('Lazy evaluation', () => {
    it('should not compute until accessed', () => {
      let computeCount = 0;

      const cell = createCell(10);
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell) * 2;
      });

      // Not computed yet
      expect(computeCount).toBe(0);

      // First access
      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1);

      // Update cell
      set(cell, 20);

      // Recomputed immediately on set
      expect(computeCount).toBe(2);

      // Access returns cached value
      expect(get(computed)).toBe(40);
      expect(computeCount).toBe(2);
    });

    it('should handle lazy evaluation in dependency chains', () => {
      const counts: Record<string, number> = {};

      const createTracked = <T>(name: string, fn: (get: StateGetter) => T) => {
        counts[name] = 0;
        return createComputed(({ get }) => {
          counts[name]++;
          return fn(get);
        });
      };

      const a = createCell(1);
      const b = createTracked('b', (get) => get(a) * 2);
      const c = createTracked('c', (get) => get(b) * 3);
      const d = createTracked('d', (get) => get(c) * 4);

      // Nothing computed yet
      expect(counts).toEqual({ b: 0, c: 0, d: 0 });

      // Access middle of chain
      expect(get(c)).toBe(6); // 1 * 2 * 3
      expect(counts).toEqual({ b: 1, c: 1, d: 0 }); // d not computed yet

      // Update and access end
      set(a, 2);
      expect(get(d)).toBe(48); // 2 * 2 * 3 * 4
      expect(counts).toEqual({ b: 2, c: 2, d: 1 });
    });
  });

  describe('Custom compare functions', () => {
    it('should use custom compare to determine minimal updates', () => {
      let computeCount = 0;

      const cell = createCell({ value: 10, metadata: 'v1' }, { compare: (a, b) => a.value === b.value });

      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell).value * 2;
      });

      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1);

      // Update metadata only - should not trigger recomputation
      set(cell, { value: 10, metadata: 'v2' });
      expect(get(computed)).toBe(20);
      expect(computeCount).toBe(1);

      // Update value - should trigger
      set(cell, { value: 20, metadata: 'v2' });
      expect(get(computed)).toBe(40);
      expect(computeCount).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty dependency changes', () => {
      let computeCount = 0;

      const toggle = createCell(true);
      const value = createCell(10);

      const computed = createComputed(({ get }) => {
        computeCount++;
        // Conditional dependency that might be empty
        return get(toggle) ? get(value) : 0;
      });

      expect(get(computed)).toBe(10);
      expect(computeCount).toBe(1);

      // Remove dependency
      set(toggle, false);
      expect(get(computed)).toBe(0);
      expect(computeCount).toBe(2);

      // Change value that's no longer a dependency
      set(value, 20);
      expect(get(computed)).toBe(0);
      expect(computeCount).toBe(2); // No recomputation
    });

    it('should handle rapid changes efficiently', () => {
      let computeCount = 0;

      const cell = createCell(0);
      const computed = createComputed(({ get }) => {
        computeCount++;
        return get(cell) * 2;
      });

      // Rapid updates in single atomicUpdate
      atomicUpdate(({ set }) => {
        for (let i = 1; i <= 100; i++) {
          set(cell, i);
        }
      });

      // Should only compute once after all updates
      expect(get(computed)).toBe(200);
      expect(computeCount).toBe(1);
    });
  });
});
