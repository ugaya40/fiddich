import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set } from '../../../src';

describe('dynamic-dependencies', () => {
  it('should track dependencies that change based on values', () => {
    const useA = createCell(true);
    const cellA = createCell(10);
    const cellB = createCell(20);
    
    let computeCount = 0;
    const computed = createComputed(({ get }) => {
      computeCount++;
      return get(useA) ? get(cellA) : get(cellB);
    });
    
    // Initial: depends on cellA
    expect(get(computed)).toBe(10);
    expect(computeCount).toBe(1);
    
    // Change cellA - should recompute
    set(cellA, 15);
    expect(get(computed)).toBe(15);
    expect(computeCount).toBe(2);
    
    // Change cellB - should NOT recompute (not dependent)
    set(cellB, 25);
    expect(get(computed)).toBe(15);
    expect(computeCount).toBe(2);
    
    // Switch to cellB
    set(useA, false);
    expect(get(computed)).toBe(25);
    expect(computeCount).toBe(3);
    
    // Now cellA changes should NOT trigger recompute
    set(cellA, 30);
    expect(get(computed)).toBe(25);
    expect(computeCount).toBe(3);
    
    // But cellB changes should trigger recompute
    set(cellB, 35);
    expect(get(computed)).toBe(35);
    expect(computeCount).toBe(4);
  });

  it('should add new dependencies dynamically', () => {
    const cells = [
      createCell(1),
      createCell(2),
      createCell(3),
      createCell(4),
      createCell(5)
    ];
    const count = createCell(2);
    
    let computeCount = 0;
    const sum = createComputed(({ get }) => {
      computeCount++;
      const n = get(count);
      let result = 0;
      for (let i = 0; i < n; i++) {
        result += get(cells[i]);
      }
      return result;
    });
    
    // Initial: sum of first 2 cells
    expect(get(sum)).toBe(3); // 1 + 2
    expect(computeCount).toBe(1);
    
    // Change a dependent cell
    set(cells[0], 10);
    expect(get(sum)).toBe(12); // 10 + 2
    expect(computeCount).toBe(2);
    
    // Change a non-dependent cell
    set(cells[3], 40);
    expect(get(sum)).toBe(12); // Still 10 + 2
    expect(computeCount).toBe(2);
    
    // Increase count to include more cells
    set(count, 4);
    expect(get(sum)).toBe(55); // 10 + 2 + 3 + 40
    expect(computeCount).toBe(3);
    
    // Now cells[3] is a dependency
    set(cells[3], 100);
    expect(get(sum)).toBe(115); // 10 + 2 + 3 + 100
    expect(computeCount).toBe(4);
  });

  it('should remove old dependencies when no longer used', () => {
    const selector = createCell<'a' | 'b' | 'c'>('a');
    
    const aChangeCount = vi.fn();
    const bChangeCount = vi.fn();
    const cChangeCount = vi.fn();
    
    const cellA = createCell<number>(100, { onChange: aChangeCount });
    const cellB = createCell<number>(200, { onChange: bChangeCount });
    const cellC = createCell<number>(300, { onChange: cChangeCount });
    
    let computeCount = 0;
    const computed = createComputed(({ get }) => {
      computeCount++;
      switch (get(selector)) {
        case 'a': return get(cellA);
        case 'b': return get(cellB);
        case 'c': return get(cellC);
      }
    });
    
    // Initial: depends on cellA
    expect(get(computed)).toBe(100);
    
    // Verify dependency on cellA
    set(cellA, 110);
    expect(computeCount).toBe(2);
    
    // Switch to cellB
    set(selector, 'b');
    expect(get(computed)).toBe(200);
    expect(computeCount).toBe(3);
    
    // cellA is no longer a dependency
    set(cellA, 120);
    expect(computeCount).toBe(3); // No recomputation
    
    // cellB is now a dependency
    set(cellB, 210);
    expect(computeCount).toBe(4);
    
    // Switch to cellC
    set(selector, 'c');
    expect(get(computed)).toBe(300);
    expect(computeCount).toBe(5);
    
    // Neither cellA nor cellB trigger recomputation
    set(cellA, 130);
    set(cellB, 220);
    expect(computeCount).toBe(5);
    
    // Only cellC triggers recomputation
    set(cellC, 310);
    expect(computeCount).toBe(6);
  });

  it('should handle switching between multiple dependency sets', () => {
    const mode = createCell<'sum' | 'product' | 'max'>('sum');
    const groupA = [createCell(1), createCell(2), createCell(3)];
    const groupB = [createCell(10), createCell(20), createCell(30)];
    const groupC = [createCell(100), createCell(200), createCell(300)];
    
    let computeCount = 0;
    const result = createComputed(({ get }) => {
      computeCount++;
      const m = get(mode);
      
      switch (m) {
        case 'sum':
          return groupA.reduce((acc, cell) => acc + get(cell), 0);
        case 'product':
          return groupB.reduce((acc, cell) => acc * get(cell), 1);
        case 'max':
          return Math.max(...groupC.map(cell => get(cell)));
      }
    });
    
    // Initial: sum mode, depends on groupA
    expect(get(result)).toBe(6); // 1 + 2 + 3
    expect(computeCount).toBe(1);
    
    // Change in groupA affects result
    set(groupA[0], 10);
    expect(get(result)).toBe(15); // 10 + 2 + 3
    expect(computeCount).toBe(2);
    
    // Change in groupB doesn't affect result
    set(groupB[0], 100);
    expect(get(result)).toBe(15);
    expect(computeCount).toBe(2);
    
    // Switch to product mode
    set(mode, 'product');
    expect(get(result)).toBe(60000); // 100 * 20 * 30
    expect(computeCount).toBe(3);
    
    // Now groupA doesn't affect, but groupB does
    set(groupA[1], 20);
    expect(get(result)).toBe(60000);
    expect(computeCount).toBe(3);
    
    set(groupB[1], 25);
    expect(get(result)).toBe(75000); // 100 * 25 * 30
    expect(computeCount).toBe(4);
    
    // Switch to max mode
    set(mode, 'max');
    expect(get(result)).toBe(300); // max(100, 200, 300)
    expect(computeCount).toBe(5);
    
    // Only groupC affects result now
    set(groupC[2], 400);
    expect(get(result)).toBe(400);
    expect(computeCount).toBe(6);
  });

  it('should update dependency graph on nested computed changes', () => {
    const switchA = createCell(true);
    const switchB = createCell(true);
    
    const cellA1 = createCell(1);
    const cellA2 = createCell(2);
    const cellB1 = createCell(10);
    const cellB2 = createCell(20);
    
    let middleCount = 0;
    const middle = createComputed(({ get }) => {
      middleCount++;
      return get(switchA) ? get(cellA1) + get(cellA2) : get(cellB1) + get(cellB2);
    });
    
    let finalCount = 0;
    const final = createComputed(({ get }) => {
      finalCount++;
      return get(switchB) ? get(middle) * 2 : get(middle) * 3;
    });
    
    // Initial state
    expect(get(final)).toBe(6); // (1 + 2) * 2
    expect(middleCount).toBe(1);
    expect(finalCount).toBe(1);
    
    // Change A1 - should propagate through middle to final
    set(cellA1, 5);
    expect(get(final)).toBe(14); // (5 + 2) * 2
    expect(middleCount).toBe(2);
    expect(finalCount).toBe(2);
    
    // Change B1 - should NOT affect (middle depends on A cells)
    set(cellB1, 50);
    expect(get(final)).toBe(14);
    expect(middleCount).toBe(2);
    expect(finalCount).toBe(2);
    
    // Switch middle to use B cells
    set(switchA, false);
    expect(get(final)).toBe(140); // (50 + 20) * 2
    expect(middleCount).toBe(3);
    expect(finalCount).toBe(3);
    
    // Now A1 changes don't affect, but B1 changes do
    set(cellA1, 10);
    expect(get(final)).toBe(140);
    expect(middleCount).toBe(3);
    expect(finalCount).toBe(3);
    
    set(cellB1, 60);
    expect(get(final)).toBe(160); // (60 + 20) * 2
    expect(middleCount).toBe(4);
    expect(finalCount).toBe(4);
    
    // Switch final multiplier
    set(switchB, false);
    expect(get(final)).toBe(240); // (60 + 20) * 3
    expect(middleCount).toBe(4); // middle didn't need recomputation
    expect(finalCount).toBe(5);
  });

  it('should handle rapid dependency changes', () => {
    const cells = Array.from({ length: 10 }, (_, i) => createCell(i));
    const indices = createCell([0, 1, 2]);
    
    let computeCount = 0;
    const sum = createComputed(({ get }) => {
      computeCount++;
      return get(indices).reduce((acc, idx) => acc + get(cells[idx]), 0);
    });
    
    // Initial
    expect(get(sum)).toBe(3); // 0 + 1 + 2
    expect(computeCount).toBe(1);
    
    // Rapid changes to dependency set
    const initialCount = computeCount;
    
    // Change 1: different indices
    set(indices, [3, 4, 5]);
    expect(get(sum)).toBe(12); // 3 + 4 + 5
    
    // Change 2: overlapping indices
    set(indices, [4, 5, 6]);
    expect(get(sum)).toBe(15); // 4 + 5 + 6
    
    // Change 3: completely different
    set(indices, [7, 8, 9]);
    expect(get(sum)).toBe(24); // 7 + 8 + 9
    
    // Change 4: back to some original
    set(indices, [0, 5, 9]);
    expect(get(sum)).toBe(14); // 0 + 5 + 9
    
    // Change 5: empty then full
    set(indices, []);
    expect(get(sum)).toBe(0);
    
    set(indices, [0, 1, 2, 3, 4]);
    expect(get(sum)).toBe(10); // 0 + 1 + 2 + 3 + 4
    
    // Verify all changes triggered recomputation
    expect(computeCount).toBe(initialCount + 6);
    
    // Verify current dependencies work correctly
    set(cells[0], 10);
    expect(get(sum)).toBe(20); // 10 + 1 + 2 + 3 + 4
    
    set(cells[7], 70); // Not a current dependency
    expect(get(sum)).toBe(20); // No change
  });
});