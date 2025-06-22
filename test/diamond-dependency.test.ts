import { describe, expect, it } from 'vitest';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';

describe('Diamond Dependency Pattern', () => {
  describe('Non-atomicUpdate environment', () => {
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

      // Update root without atomicUpdate
      set(root, 20);

      expect(get(bottom)).toBe(100);

      // Fiddich ensures each computed is calculated only once per update,
      // avoiding the diamond dependency problem
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2);
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
});
