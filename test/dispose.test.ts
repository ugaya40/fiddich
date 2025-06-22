import { describe, expect, it, vi } from 'vitest';
import { atomicUpdate, createCell, createComputed, get, set } from '../src';
import { createDisposable, createDisposables, createDisposeTracker, wait } from './test-helpers';

describe('Dispose functionality', () => {
  describe('Cell Symbol.dispose', () => {
    it('should dispose Cell and clear dependents', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      // Initialize computed
      expect(get(computed)).toBe(20);
      expect(cell.dependents.size).toBe(1);

      cell[Symbol.dispose]();

      expect(cell.dependents.size).toBe(0);
    });

    it('should dispose value when Cell contains disposable', () => {
      const disposed = vi.fn();
      const disposable = { [Symbol.dispose]: disposed };

      const cell = createCell(disposable);
      cell[Symbol.dispose]();

      expect(disposed).toHaveBeenCalledTimes(1);
    });

    it('should not fail when Cell contains non-disposable value', () => {
      const cell = createCell({ data: 'test' });
      expect(() => cell[Symbol.dispose]()).not.toThrow();
    });

    it('should handle null/undefined values', () => {
      const cellNull = createCell<null>(null);
      const cellUndefined = createCell<undefined>(undefined);

      expect(() => cellNull[Symbol.dispose]()).not.toThrow();
      expect(() => cellUndefined[Symbol.dispose]()).not.toThrow();
    });
  });

  describe('Computed Symbol.dispose', () => {
    it('should dispose Computed and clear dependencies/dependents', () => {
      const cell1 = createCell(5);
      const cell2 = createCell(3);
      const computed1 = createComputed(({ get }) => get(cell1) + get(cell2));
      const computed2 = createComputed(({ get }) => get(computed1) * 2);

      // Initialize
      expect(get(computed2)).toBe(16);

      expect(computed1.dependencies.size).toBe(2);
      expect(computed1.dependents.size).toBe(1);
      expect(cell1.dependents.size).toBe(1);

      computed1[Symbol.dispose]();

      expect(computed1.dependencies.size).toBe(0);
      expect(computed1.dependents.size).toBe(0);
      expect(cell1.dependents.size).toBe(0);
      expect(cell2.dependents.size).toBe(0);
    });

    it('should handle uninitialized Computed dispose', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      // Not initialized yet
      expect(computed.isInitialized).toBe(false);
      expect(() => computed[Symbol.dispose]()).not.toThrow();
    });
  });

  describe('set operation auto-dispose', () => {
    it('should auto-dispose old value when setting new disposable value', () => {
      const { disposable: value1, disposed: disposed1 } = createDisposable('first');
      const { disposable: value2, disposed: disposed2 } = createDisposable('second');

      const cell = createCell(value1);

      set(cell, value2);

      expect(disposed1).toHaveBeenCalledTimes(1);
      expect(disposed2).not.toHaveBeenCalled();
    });

    it('should auto-dispose in atomicUpdate context', () => {
      const { disposable: oldValue, disposed } = createDisposable('old');
      const { disposable: newValue } = createDisposable('new');

      const cell = createCell(oldValue);

      atomicUpdate((ops) => {
        ops.set(cell, newValue);
        // Should not dispose yet
        expect(disposed).not.toHaveBeenCalled();
      });

      // Should dispose after commit
      expect(disposed).toHaveBeenCalledTimes(1);
    });

    it('should not dispose on rollback', () => {
      const { disposable: oldValue, disposed } = createDisposable('old');
      const { disposable: newValue } = createDisposable('new');

      const cell = createCell(oldValue);

      expect(() => {
        atomicUpdate((ops) => {
          ops.set(cell, newValue);
          throw new Error('Rollback');
        });
      }).toThrow('Rollback');

      expect(disposed).not.toHaveBeenCalled();
      expect(get(cell)).toBe(oldValue);
    });
  });

  describe('ops.dispose', () => {
    it('should delay dispose until commit', () => {
      const disposed = vi.fn();
      const target = { [Symbol.dispose]: disposed };

      atomicUpdate((ops) => {
        ops.dispose(target);
        expect(disposed).not.toHaveBeenCalled();
      });

      expect(disposed).toHaveBeenCalledTimes(1);
    });

    it('should not dispose on rollback', () => {
      const disposed = vi.fn();
      const target = { [Symbol.dispose]: disposed };

      expect(() => {
        atomicUpdate((ops) => {
          ops.dispose(target);
          throw new Error('Rollback');
        });
      }).toThrow('Rollback');

      expect(disposed).not.toHaveBeenCalled();
    });

    it('should handle multiple dispose targets', () => {
      const disposables = createDisposables('target1', 'target2', 'target3');

      atomicUpdate((ops) => {
        disposables.forEach(({ disposable }) => ops.dispose(disposable));
      });

      disposables.forEach(({ disposed }) => {
        expect(disposed).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle async atomicUpdate', async () => {
      const disposed = vi.fn();
      const target = {
        [Symbol.dispose]: disposed,
      };

      await atomicUpdate(async (ops) => {
        ops.dispose(target);
        await wait(10);
        expect(disposed).not.toHaveBeenCalled();
      });

      expect(disposed).toHaveBeenCalledTimes(1);
    });

    it('should work with nested atomicUpdate', () => {
      const disposed1 = vi.fn();
      const disposed2 = vi.fn();

      const target1 = { [Symbol.dispose]: disposed1 };
      const target2 = { [Symbol.dispose]: disposed2 };

      atomicUpdate((outerOps) => {
        outerOps.dispose(target1);

        atomicUpdate((innerOps) => {
          innerOps.dispose(target2);
        });

        // Inner should have disposed
        expect(disposed2).toHaveBeenCalledTimes(1);
        // Outer not yet
        expect(disposed1).not.toHaveBeenCalled();
      });

      expect(disposed1).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex dispose scenarios', () => {
    it('should handle dispose chain correctly', () => {
      const { disposeOrder, createTrackedDisposable } = createDisposeTracker();

      const parent = createCell(createTrackedDisposable('parent'));

      atomicUpdate((ops) => {
        ops.set(parent, createTrackedDisposable('child1'));
        ops.dispose(createTrackedDisposable('manual1'));
        ops.set(parent, createTrackedDisposable('child2'));
        ops.dispose(createTrackedDisposable('manual2'));
      });

      // parent and child1 are disposed due to set operations
      // manual1 and manual2 are in toDispose
      // Order within toDispose is not guaranteed
      expect(disposeOrder).toContain('parent');
      expect(disposeOrder).toContain('child1');
      expect(disposeOrder).toContain('manual1');
      expect(disposeOrder).toContain('manual2');
      expect(disposeOrder.length).toBe(4);
    });

    it('should handle dispose with rejectAllChanges', () => {
      const { disposable: target1, disposed: disposed1 } = createDisposable();
      const { disposable: target2, disposed: disposed2 } = createDisposable();
      const { disposable: target3, disposed: disposed3 } = createDisposable();

      atomicUpdate((ops) => {
        ops.dispose(target1);
        ops.dispose(target2);
        ops.rejectAllChanges();
        ops.dispose(target3);
      });

      expect(disposed1).not.toHaveBeenCalled();
      expect(disposed2).not.toHaveBeenCalled();
      expect(disposed3).toHaveBeenCalledTimes(1);
    });

    it('should preserve ops.dispose call order', () => {
      const disposeOrder: string[] = [];

      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));

      // Override dispose for tracking
      const originalDispose1 = cell1[Symbol.dispose].bind(cell1);
      const originalDispose2 = cell2[Symbol.dispose].bind(cell2);
      const originalDisposeC = computed[Symbol.dispose].bind(computed);

      cell1[Symbol.dispose] = () => {
        disposeOrder.push('cell1');
        originalDispose1();
      };

      cell2[Symbol.dispose] = () => {
        disposeOrder.push('cell2');
        originalDispose2();
      };

      computed[Symbol.dispose] = () => {
        disposeOrder.push('computed');
        originalDisposeC();
      };

      // Initialize
      get(computed);

      // Dispose in specific order
      atomicUpdate((ops) => {
        ops.dispose(computed);
        ops.dispose(cell1);
        ops.dispose(cell2);
      });

      expect(disposeOrder).toEqual(['computed', 'cell1', 'cell2']);
      expect(computed.dependencies.size).toBe(0);
      expect(cell1.dependents.size).toBe(0);
      expect(cell2.dependents.size).toBe(0);
    });

    it('should handle circular references in disposable objects', () => {
      const disposed1 = vi.fn();
      const disposed2 = vi.fn();

      type DisposableObj = { [Symbol.dispose]: () => void; ref?: DisposableObj };
      const obj1: DisposableObj = { [Symbol.dispose]: disposed1 };
      const obj2: DisposableObj = { [Symbol.dispose]: disposed2 };

      // Create circular reference
      obj1.ref = obj2;
      obj2.ref = obj1;

      const cell = createCell<DisposableObj | null>(obj1);

      set(cell, null);

      expect(disposed1).toHaveBeenCalledTimes(1);
      // Only the root object is disposed
    });

    it('should throw if dispose fails', () => {
      const disposed1 = vi.fn();
      const disposed2 = vi.fn();
      const errorDispose = vi.fn(() => {
        throw new Error('Dispose error');
      });

      const target1 = { [Symbol.dispose]: disposed1 };
      const targetError = { [Symbol.dispose]: errorDispose };
      const target2 = { [Symbol.dispose]: disposed2 };

      // Should throw on dispose error
      expect(() => {
        atomicUpdate((ops) => {
          ops.dispose(target1);
          ops.dispose(targetError);
          ops.dispose(target2);
        });
      }).toThrow('Dispose error');

      // First one should be disposed
      expect(disposed1).toHaveBeenCalledTimes(1);
      expect(errorDispose).toHaveBeenCalledTimes(1);
      // Third one should not be disposed due to error
      expect(disposed2).not.toHaveBeenCalled();
    });
  });
});
