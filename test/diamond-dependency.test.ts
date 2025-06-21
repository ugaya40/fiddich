import { describe, expect, it } from 'vitest';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';

describe('Diamond Dependency Pattern', () => {
  describe('Non-atomicUpdate environment', () => {
    it('should compute leaf node twice in diamond pattern', () => {
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
        const l = get(left);
        const r = get(right);
        return l + r;
      });

      // Initial computation
      expect(get(bottom)).toBe(50);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(bottomCount).toBe(1);

      // Update root without atomicUpdate
      set(root, 20);

      expect(get(bottom)).toBe(100);

      // In non-atomic environment, bottom might be computed twice
      // Once when left changes, once when right changes
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2); // This might be 3 if computed twice
    });
  });

  describe('atomicUpdate environment', () => {
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
        const l = get(left);
        const r = get(right);
        return l + r;
      });

      // Initial computation
      expect(get(bottom)).toBe(50);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(bottomCount).toBe(1);

      // Update root WITH atomicUpdate
      atomicUpdate(({ set }) => {
        set(root, 20);
      });
      expect(get(bottom)).toBe(100);

      // In atomic environment, bottom should be computed only once after both dependencies update
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2); // Initial + one update
    });
  });

  describe('Detailed execution flow', () => {
    it('should show the difference in execution order', () => {
      const root = createCell(10);

      const left = createComputed(({ get }) => {
        const value = get(root) * 2;
        return value;
      });

      const right = createComputed(({ get }) => {
        const value = get(root) * 3;
        return value;
      });

      const bottom = createComputed(({ get }) => {
        const l = get(left);
        const r = get(right);
        const result = l + r;
        return result;
      });

      // Initial
      expect(get(bottom)).toBe(50);

      // Non-atomic update
      set(root, 20);
      expect(get(bottom)).toBe(100);

      // Reset
      set(root, 10);
      expect(get(bottom)).toBe(50);

      // Atomic update
      atomicUpdate(({ set }) => {
        set(root, 20);
      });
      expect(get(bottom)).toBe(100);
    });
  });
});
