import { describe, expect, it } from 'vitest';
import { atomicUpdate, cell, computed, get, set, tryAtomicUpdate } from '../src';

describe('AtomicUpdate basic operations', () => {
  it('should commit changes atomically', () => {
    const cellA = cell(10);
    const cellB = cell(20);
    const comp = computed(({ get }) => get(cellA) + get(cellB));

    expect(get(comp)).toBe(30);

    atomicUpdate(({ get, set }) => {
      set(cellA, 15);
      set(cellB, 25);
      // Inside atomic update, changes are visible
      expect(get(cellA)).toBe(15);
      expect(get(cellB)).toBe(25);
      expect(get(comp)).toBe(40);
    });

    // After commit, changes are reflected
    expect(get(cellA)).toBe(15);
    expect(get(cellB)).toBe(25);
    expect(get(comp)).toBe(40);
  });

  it('should rollback changes on error', () => {
    const cellA = cell(10);
    const cellB = cell(20);

    expect(() => {
      atomicUpdate(({ set }) => {
        set(cellA, 15);
        set(cellB, 25);
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    // Values should remain unchanged
    expect(get(cellA)).toBe(10);
    expect(get(cellB)).toBe(20);
  });

  it('should track dependencies correctly in atomic update', () => {
    const condition = cell(true);
    const cellA = cell(10);
    const cellB = cell(20);
    const comp = computed(({ get }) => {
      return get(condition) ? get(cellA) : get(cellB);
    });

    expect(get(comp)).toBe(10);

    atomicUpdate(({ set }) => {
      set(condition, false);
      // Computed should now depend on cellB instead of cellA
    });

    expect(get(comp)).toBe(20);

    // Changing cellA should not affect computed
    set(cellA, 100);
    expect(get(comp)).toBe(20);

    // Changing cellB should affect computed
    set(cellB, 200);
    expect(get(comp)).toBe(200);
  });

  it('should handle computed creation inside atomic update', () => {
    const cellA = cell(10);
    let computedRef: any;

    atomicUpdate(({ get }) => {
      computedRef = computed(({ get }) => get(cellA) * 2);
      expect(get(computedRef)).toBe(20);
    });

    expect(get(computedRef)).toBe(20);
    set(cellA, 15);
    expect(get(computedRef)).toBe(30);
  });

  it('should handle multiple atomic updates in sequence', () => {
    const cellA = cell(0);

    atomicUpdate(({ set }) => set(cellA, 1));
    expect(get(cellA)).toBe(1);

    atomicUpdate(({ set }) => set(cellA, 2));
    expect(get(cellA)).toBe(2);

    atomicUpdate(({ set }) => set(cellA, 3));
    expect(get(cellA)).toBe(3);
  });

  it('should handle tryAtomicUpdate without throwing', () => {
    const cellA = cell(10);

    // Successful update
    const result1 = tryAtomicUpdate(({ set }) => {
      set(cellA, 20);
      return 'success';
    });

    expect(result1.executed).toBe(true);
    if (result1.executed) {
      expect(result1.value).toBe('success');
    }
    expect(get(cellA)).toBe(20);

    // Failed update - tryAtomicUpdate still throws errors without concurrent tokens
    expect(() => {
      tryAtomicUpdate(({ set }) => {
        set(cellA, 30);
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    expect(get(cellA)).toBe(20); // Value unchanged due to rollback
  });

  it('should handle complex state updates', () => {
    const counter = cell(0);
    const multiplier = cell(2);
    const result = computed(({ get }) => get(counter) * get(multiplier));

    atomicUpdate(({ get, set }) => {
      const currentCounter = get(counter);
      const currentMultiplier = get(multiplier);

      set(counter, currentCounter + 10);
      set(multiplier, currentMultiplier * 2);

      // Verify computed updates correctly inside atomic
      expect(get(result)).toBe(40); // 10 * 4
    });

    expect(get(result)).toBe(40);
  });

  it('should isolate changes between concurrent atomic updates', async () => {
    const cellA = cell(0);
    const computedA = computed(({ get }) => get(cellA) * 10);

    // Start two async atomic updates
    const update1 = atomicUpdate(async ({ get, set }) => {
      expect(get(cellA)).toBe(0);
      set(cellA, 1);
      expect(get(cellA)).toBe(1);
      expect(get(computedA)).toBe(10);

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(get(cellA)).toBe(1);
      set(cellA, 2);
      expect(get(cellA)).toBe(2);
      expect(get(computedA)).toBe(20);
    });

    const update2 = atomicUpdate(async ({ get, set }) => {
      expect(get(cellA)).toBe(0);
      set(cellA, 10);
      expect(get(cellA)).toBe(10);
      expect(get(computedA)).toBe(100);

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(get(cellA)).toBe(10);
      set(cellA, 20);
      expect(get(cellA)).toBe(20);
      expect(get(computedA)).toBe(200);
    });

    // Wait for both to complete
    await Promise.all([update1, update2]);

    // Last writer wins
    const finalValue = get(cellA);
    expect([2, 20]).toContain(finalValue);
    expect(get(computedA)).toBe(finalValue * 10);
  });
});
