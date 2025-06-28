import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../../../src';

describe('atomicUpdate - ops.get/ops.set', () => {
  describe('ops.get', () => {
    it('should read current value within transaction', () => {
      const cell = createCell(10);
      
      atomicUpdate(({ get }) => {
        expect(get(cell)).toBe(10);
      });
    });

    it('should establish dependencies when reading from computed', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      let computedValue: number;
      atomicUpdate(({ get }) => {
        computedValue = get(computed);
      });
      
      expect(computedValue!).toBe(10);
    });

    it('should see uncommitted changes within same transaction', () => {
      const cell = createCell('initial');
      
      atomicUpdate(({ get, set }) => {
        expect(get(cell)).toBe('initial');
        
        set(cell, 'changed');
        expect(get(cell)).toBe('changed');
        
        set(cell, 'changed again');
        expect(get(cell)).toBe('changed again');
      });
      
      expect(get(cell)).toBe('changed again');
    });
  });

  describe('ops.set', () => {
    it('should buffer changes within transaction', async () => {
      const cell = createCell(1);
      
      const promise = atomicUpdate(async ({ set }) => {
        set(cell, 2);
        // Wait to keep transaction open
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // While transaction is running, external read sees old value
      expect(get(cell)).toBe(1);
      
      // Wait for transaction to complete
      await promise;
      
      // After commit, value is updated
      expect(get(cell)).toBe(2);
    });

    it('should not affect external reads during transaction', () => {
      const cell = createCell('outside');
      
      atomicUpdate(({ set }) => {
        set(cell, 'inside');
        // During transaction, external read still sees old value
        expect(get(cell)).toBe('outside');
      });
      
      expect(get(cell)).toBe('inside');
    });

    it('should handle multiple sets to same cell', () => {
      const cell = createCell(0);
      
      atomicUpdate(({ set }) => {
        set(cell, 1);
        set(cell, 2);
        set(cell, 3);
      });
      
      expect(get(cell)).toBe(3);
    });

    it('should propagate changes to dependent computeds after commit', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) + 5);
      
      expect(get(computed)).toBe(15);
      
      atomicUpdate(({ set }) => {
        set(cell, 20);
      });
      
      expect(get(computed)).toBe(25);
    });
  });

  describe('ops.get and ops.set interaction', () => {
    it('should maintain consistency within transaction', () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const computed = createComputed(({ get }) => get(cellA) + get(cellB));
      
      atomicUpdate(({ get, set }) => {
        expect(get(computed)).toBe(3);
        
        set(cellA, 10);
        expect(get(computed)).toBe(12); // 10 + 2
        
        set(cellB, 20);
        expect(get(computed)).toBe(30); // 10 + 20
      });
      
      expect(get(computed)).toBe(30);
    });

    it('should handle complex dependency chains', () => {
      const base = createCell(1);
      const level1 = createComputed(({ get }) => get(base) * 2);
      const level2 = createComputed(({ get }) => get(level1) + 10);
      const level3 = createComputed(({ get }) => get(level2) * 3);
      
      atomicUpdate(({ get, set }) => {
        expect(get(level3)).toBe(36); // ((1 * 2) + 10) * 3
        
        set(base, 5);
        expect(get(level3)).toBe(60); // ((5 * 2) + 10) * 3
      });
      
      expect(get(level3)).toBe(60);
    });

    it('should roll back all changes on error', () => {
      const cellA = createCell('a');
      const cellB = createCell('b');
      const cellC = createCell('c');
      
      expect(() => {
        atomicUpdate(({ set }) => {
          set(cellA, 'a-changed');
          set(cellB, 'b-changed');
          set(cellC, 'c-changed');
          throw new Error('Transaction failed');
        });
      }).toThrow('Transaction failed');
      
      // All values should remain unchanged
      expect(get(cellA)).toBe('a');
      expect(get(cellB)).toBe('b');
      expect(get(cellC)).toBe('c');
    });

    it('should handle conditional updates based on current values', () => {
      const counter = createCell(0);
      const isEven = createComputed(({ get }) => get(counter) % 2 === 0);
      
      atomicUpdate(({ get, set }) => {
        if (get(isEven)) {
          set(counter, get(counter) + 1);
        } else {
          set(counter, get(counter) + 2);
        }
      });
      
      expect(get(counter)).toBe(1);
      expect(get(isEven)).toBe(false);
      
      atomicUpdate(({ get, set }) => {
        if (get(isEven)) {
          set(counter, get(counter) + 1);
        } else {
          set(counter, get(counter) + 2);
        }
      });
      
      expect(get(counter)).toBe(3);
      expect(get(isEven)).toBe(false);
    });
  });
});