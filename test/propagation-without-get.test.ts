import { describe, expect, it } from 'vitest';
import { atomicUpdate, type Computed, createCell, createComputed, get } from '../src';

describe('Propagation without get in atomicUpdate', () => {
  it('should propagate changes through entire dependency chain even without get', () => {
    const cellA = createCell(1);
    const computedB = createComputed(({ get }) => get(cellA) * 2);
    const computedC = createComputed(({ get }) => get(computedB) * 3);
    const computedD = createComputed(({ get }) => get(computedC) * 4);

    // Initialize
    expect(get(computedD)).toBe(24); // 1 * 2 * 3 * 4

    // Update cellA without getting any computed in atomicUpdate
    atomicUpdate((ops) => {
      ops.set(cellA, 10);
      // NOT calling ops.get on any computed
    });

    // All computeds should reflect the new value
    expect(get(computedB)).toBe(20); // 10 * 2
    expect(get(computedC)).toBe(60); // 20 * 3
    expect(get(computedD)).toBe(240); // 60 * 4
  });

  it('should handle multiple disconnected chains', () => {
    const cellX = createCell(5);
    const cellY = createCell(10);

    const chainX1 = createComputed(({ get }) => get(cellX) + 1);
    const chainX2 = createComputed(({ get }) => get(chainX1) + 2);
    const chainX3 = createComputed(({ get }) => get(chainX2) + 3);

    const chainY1 = createComputed(({ get }) => get(cellY) - 1);
    const chainY2 = createComputed(({ get }) => get(chainY1) - 2);
    const chainY3 = createComputed(({ get }) => get(chainY2) - 3);

    // Initialize
    expect(get(chainX3)).toBe(11); // 5 + 1 + 2 + 3
    expect(get(chainY3)).toBe(4); // 10 - 1 - 2 - 3

    // Update both cells without getting any computed
    atomicUpdate((ops) => {
      ops.set(cellX, 20);
      ops.set(cellY, 30);
    });

    // Both chains should be updated
    expect(get(chainX3)).toBe(26); // 20 + 1 + 2 + 3
    expect(get(chainY3)).toBe(24); // 30 - 1 - 2 - 3
  });

  it('should work with deep dependency chains', () => {
    const cell = createCell(1);

    // Create a deep chain of 10 computeds
    const computeds: Computed<number>[] = [];
    for (let i = 0; i < 10; i++) {
      if (i === 0) {
        computeds.push(createComputed(({ get }) => get(cell) + 1));
      } else {
        computeds.push(createComputed(({ get }) => get(computeds[i - 1]) + 1));
      }
    }

    // Initialize last computed
    expect(get(computeds[9])).toBe(11); // 1 + 10

    // Update cell without getting any computed
    atomicUpdate((ops) => {
      ops.set(cell, 100);
    });

    // Last computed should reflect the change
    expect(get(computeds[9])).toBe(110); // 100 + 10
  });

  it('should handle diamond dependencies without get', () => {
    const root = createCell(10);
    const left = createComputed(({ get }) => get(root) * 2);
    const right = createComputed(({ get }) => get(root) * 3);
    const bottom = createComputed(({ get }) => get(left) + get(right));

    // Initialize
    expect(get(bottom)).toBe(50); // 20 + 30

    // Update root without getting any computed
    atomicUpdate((ops) => {
      ops.set(root, 20);
    });

    // Bottom should reflect the change
    expect(get(bottom)).toBe(100); // 40 + 60
  });
});
