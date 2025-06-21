import { describe, expect, it } from 'vitest';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';

describe('Diamond Dependency Glitch Test', () => {
  it('should demonstrate potential glitch in separate set operations', () => {
    const a = createCell(1);
    const b = createCell(1);

    const left = createComputed(({ get }) => get(a) + get(b));
    const right = createComputed(({ get }) => get(a) * get(b));

    const bottom = createComputed(({ get }) => {
      const value = get(left) + get(right);
      return value;
    });

    // Initial
    expect(get(bottom)).toBe(3); // (1+1) + (1*1) = 2 + 1 = 3

    // Two separate set operations
    set(a, 2);
    get(bottom);

    set(b, 3);
    expect(get(bottom)).toBe(11); // (2+3) + (2*3) = 5 + 6 = 11

    // Reset
    set(a, 1);
    set(b, 1);
    get(bottom);

    // AtomicUpdate
    atomicUpdate(({ set }) => {
      set(a, 2);
      set(b, 3);
    });
    expect(get(bottom)).toBe(11); // (2+3) + (2*3) = 5 + 6 = 11
  });

  it('should show intermediate inconsistent state', () => {
    const x = createCell(1);
    const y = createCell(1);

    // Invariant: sum should always equal product for our values
    const sum = createComputed(({ get }) => {
      const result = get(x) + get(y);
      return result;
    });

    const product = createComputed(({ get }) => {
      const result = get(x) * get(y);
      return result;
    });

    const checker = createComputed(({ get }) => {
      const s = get(sum);
      const p = get(product);
      const isValid = s === p;
      return isValid;
    });

    // Initial state: 1+1 = 2, 1*1 = 1, not equal
    expect(get(checker)).toBe(false);

    // Try to maintain invariant: x=2, y=2 → 2+2=4, 2*2=4
    set(x, 2);
    // Intermediate state might be inconsistent

    set(y, 2);
    // Now should be consistent
    expect(get(checker)).toBe(true);

    // Reset
    set(x, 1);
    set(y, 1);

    // AtomicUpdate ensures consistency
    atomicUpdate(({ set }) => {
      set(x, 2);
      set(y, 2);
    });
    expect(get(checker)).toBe(true);
  });
});
