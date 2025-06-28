import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, atomicUpdate } from '../../../src';
import { createDisposable, createDisposeTracker } from '../../helpers';

describe('atomicUpdate - ops.dispose', () => {
  it('should schedule disposal for commit time', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    atomicUpdate(({ dispose }) => {
      dispose(cell);
      // Disposal should not happen yet
      expect(disposed).not.toHaveBeenCalled();
    });
    
    // Disposal should happen after commit
    expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('should not dispose on rollback', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    expect(() => {
      atomicUpdate(({ dispose }) => {
        dispose(cell);
        expect(disposed).not.toHaveBeenCalled();
        throw new Error('Rollback');
      });
    }).toThrow('Rollback');
    
    // Disposal should not happen after rollback
    expect(disposed).not.toHaveBeenCalled();
  });

  it('should handle multiple dispose calls', () => {
    const { disposeOrder, createTrackedDisposable } = createDisposeTracker();
    const cellA = createCell(createTrackedDisposable('A'));
    const cellB = createCell(createTrackedDisposable('B'));
    const cellC = createCell(createTrackedDisposable('C'));
    
    atomicUpdate(({ dispose }) => {
      dispose(cellA);
      dispose(cellB);
      dispose(cellC);
    });
    
    // All should be disposed
    expect(disposeOrder).toEqual(['A', 'B', 'C']);
  });

  it('should dispose current value when cell is disposed', () => {
    const { disposable: value, disposed: valueDisposed } = createDisposable();
    const cell = createCell(value);
    
    atomicUpdate(({ dispose }) => {
      dispose(cell);
    });
    
    // The value held by the cell should also be disposed
    expect(valueDisposed).toHaveBeenCalledTimes(1);
  });

  it('should work with computed states', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    // Initialize computed
    expect(get(computed)).toBe(20);
    
    let wasDisposed = false;
    const originalDispose = computed[Symbol.dispose];
    computed[Symbol.dispose] = () => {
      wasDisposed = true;
      originalDispose?.call(computed);
    };
    
    atomicUpdate(({ dispose }) => {
      dispose(computed);
    });
    
    expect(wasDisposed).toBe(true);
  });

  it('should handle dispose with set operations', () => {
    const { disposable: oldValue, disposed: oldDisposed } = createDisposable('old');
    const { disposable: newValue, disposed: newDisposed } = createDisposable('new');
    const cell = createCell(oldValue);
    
    atomicUpdate(({ set, dispose }) => {
      set(cell, newValue);
      dispose(cell);
    });
    
    // Both old value (from set) and new value (from dispose) should be disposed
    expect(oldDisposed).toHaveBeenCalledTimes(1);
    expect(newDisposed).toHaveBeenCalledTimes(1);
  });

  it('should not dispose twice if already scheduled', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    atomicUpdate(({ dispose }) => {
      dispose(cell);
      dispose(cell); // Second call
      dispose(cell); // Third call
    });
    
    // Should only dispose once
    expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('should clear dispose queue on rejectAllChanges', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    atomicUpdate(({ dispose, rejectAllChanges }) => {
      dispose(cell);
      rejectAllChanges();
      // Disposal should be cancelled
    });
    
    expect(disposed).not.toHaveBeenCalled();
  });

  it('should handle dispose after rejectAllChanges', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    atomicUpdate(({ dispose, rejectAllChanges }) => {
      dispose(cell);
      rejectAllChanges();
      // Schedule again after reject
      dispose(cell);
    });
    
    // Should dispose from second call
    expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('should dispose in correct order with dependencies', () => {
    const { disposeOrder, createTrackedDisposable } = createDisposeTracker();
    
    const cellA = createCell(createTrackedDisposable('CellA'));
    const cellB = createCell(createTrackedDisposable('CellB'));
    const computed = createComputed(({ get }) => {
      get(cellA);
      get(cellB);
      return 'computed';
    });
    
    // Track computed disposal
    const originalDispose = computed[Symbol.dispose];
    computed[Symbol.dispose] = () => {
      disposeOrder.push('Computed');
      originalDispose?.call(computed);
    };
    
    // Initialize to establish dependencies
    get(computed);
    
    atomicUpdate(({ dispose }) => {
      dispose(cellA);
      dispose(computed);
      dispose(cellB);
    });
    
    expect(disposeOrder).toEqual(['CellA', 'Computed', 'CellB']);
  });

  // 新しいdispose仕様のテスト
  describe('chain disposal', () => {
    it('should dispose dependent computed when cell is disposed', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Initialize to establish dependency
      expect(get(computed)).toBe(20);
      
      let computedDisposed = false;
      const originalDispose = computed[Symbol.dispose];
      computed[Symbol.dispose] = () => {
        computedDisposed = true;
        originalDispose?.call(computed);
      };
      
      atomicUpdate(({ dispose }) => {
        dispose(cell);
      });
      
      // Computed should be disposed as well
      expect(computedDisposed).toBe(true);
    });

    it('should dispose entire dependency chain deeply', () => {
      const { disposeOrder, createTrackedDisposable } = createDisposeTracker();
      
      const cellA = createCell(createTrackedDisposable('A'));
      const computedB = createComputed(({ get }) => get(cellA));
      const computedC = createComputed(({ get }) => get(computedB));
      const computedD = createComputed(({ get }) => get(computedC));
      
      // Track computed disposals
      const trackDispose = (computed: any, name: string) => {
        const originalDispose = computed[Symbol.dispose];
        computed[Symbol.dispose] = () => {
          disposeOrder.push(name);
          originalDispose?.call(computed);
        };
      };
      
      trackDispose(computedB, 'B');
      trackDispose(computedC, 'C');
      trackDispose(computedD, 'D');
      
      // Initialize chain
      get(computedD);
      
      atomicUpdate(({ dispose }) => {
        dispose(cellA);
      });
      
      // All should be disposed (Cell has disposable value)
      expect(disposeOrder).toContain('A');
      expect(disposeOrder).toContain('B');
      expect(disposeOrder).toContain('C');
      expect(disposeOrder).toContain('D');
    });

    it('should dispose all branches in forked dependencies', () => {
      const { disposeOrder } = createDisposeTracker();
      
      const cell = createCell(10);
      const computed1 = createComputed(({ get }) => get(cell) + 1);
      const computed2 = createComputed(({ get }) => get(cell) + 2);
      
      // Track computed disposals
      const trackDispose = (computed: any, name: string) => {
        const originalDispose = computed[Symbol.dispose];
        computed[Symbol.dispose] = () => {
          disposeOrder.push(name);
          originalDispose?.call(computed);
        };
      };
      
      trackDispose(computed1, 'Computed1');
      trackDispose(computed2, 'Computed2');
      
      // Initialize both branches
      get(computed1);
      get(computed2);
      
      atomicUpdate(({ dispose }) => {
        dispose(cell);
      });
      
      // Both branches should be disposed
      expect(disposeOrder).toContain('Computed1');
      expect(disposeOrder).toContain('Computed2');
    });

    it('should handle diamond dependency correctly', () => {
      const { disposeOrder, createTrackedDisposable } = createDisposeTracker();
      
      const cellA = createCell(1);
      const computedB = createComputed(({ get }) => get(cellA) + 1);
      const computedC = createComputed(({ get }) => get(cellA) + 2);
      const computedD = createComputed(({ get }) => get(computedB) + get(computedC));
      
      // Track computed disposals
      const trackDispose = (computed: any, name: string) => {
        const originalDispose = computed[Symbol.dispose];
        computed[Symbol.dispose] = () => {
          disposeOrder.push(name);
          originalDispose?.call(computed);
        };
      };
      
      trackDispose(computedB, 'B');
      trackDispose(computedC, 'C');
      trackDispose(computedD, 'D');
      
      // Initialize diamond
      get(computedD);
      
      atomicUpdate(({ dispose }) => {
        dispose(cellA);
      });
      
      // All should be disposed exactly once
      expect(disposeOrder.filter(x => x === 'B').length).toBe(1);
      expect(disposeOrder.filter(x => x === 'C').length).toBe(1);
      expect(disposeOrder.filter(x => x === 'D').length).toBe(1);
    });
  });

  describe('access control after dispose', () => {
    it('should error on get after dispose in atomicUpdate', () => {
      const cell = createCell(10);
      
      expect(() => {
        atomicUpdate(({ get, dispose }) => {
          dispose(cell);
          // Should throw on access after dispose
          get(cell);
        });
      }).toThrow();
    });

    it('should error when accessing uninitialized computed after disposing its dependency', () => {
      const cell = createCell(10);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 5);
      
      // Initialize only computedA, not computedB
      get(computedA);
      
      expect(() => {
        atomicUpdate(({ get, dispose }) => {
          dispose(cell);
          // Should throw when trying to get uninitialized computedB
          // whose dependency chain (cell -> computedA -> computedB) is disposed
          get(computedB);
        });
      }).toThrow();
    });

    it('should allow access to cell but not to dependent computed after middle computed disposal', () => {
      const cell = createCell(10);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 5);
      
      // DO NOT initialize computedB
      
      atomicUpdate(({ get, dispose }) => {
        // Dispose only the middle computed
        dispose(computedA);
        
        // Cell should still be accessible inside atomicUpdate
        expect(() => get(cell)).not.toThrow();
        expect(get(cell)).toBe(10);
        
        // But computedB should throw (its dependency is disposed)
        expect(() => get(computedB)).toThrow();
      });
      
      // After atomicUpdate:
      // Cell should still be accessible outside
      expect(() => get(cell)).not.toThrow();
      expect(get(cell)).toBe(10);
      
      // computedA should throw (it was disposed)
      expect(() => get(computedA)).toThrow();
      
      // computedB should also throw (its dependency was disposed)
      expect(() => get(computedB)).toThrow();
    });

    it('should error when accessing deeply nested uninitialized computed after root disposal', () => {
      const cell = createCell(10);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(computedA) + 5);
      
      // DO NOT initialize computedA or computedB
      
      atomicUpdate(({ dispose }) => {
        // Dispose the root cell
        dispose(cell);
      });
      
      // After atomicUpdate, accessing computedB should throw
      // because it tries to initialize through computedA which depends on disposed cell
      expect(() => get(computedB)).toThrow();
    });

    it('should error on set after dispose in atomicUpdate', () => {
      const cell = createCell(10);
      
      expect(() => {
        atomicUpdate(({ set, dispose }) => {
          dispose(cell);
          // Should throw on set after dispose
          set(cell, 20);
        });
      }).toThrow();
    });

    it('should error on touch after dispose in atomicUpdate', () => {
      const cell = createCell(10);
      
      expect(() => {
        atomicUpdate(({ touch, dispose }) => {
          dispose(cell);
          // Should throw on touch after dispose
          touch(cell);
        });
      }).toThrow();
    });
  });

  describe('circular dependency handling', () => {
    it('should handle mutual dependency without infinite loop', () => {
      // Create mutual dependency where two computeds depend on the same cell
      // and share complex dependency relationships
      const baseCell = createCell(1);
      const computedA = createComputed(({ get }) => get(baseCell) * 2);
      const computedB = createComputed(({ get }) => get(baseCell) * 3);
      const computedC = createComputed(({ get }) => get(computedA) + get(computedB));
      const computedD = createComputed(({ get }) => get(computedA) + get(computedC));
      const computedE = createComputed(({ get }) => get(computedB) + get(computedC));
      
      // Initialize complex graph
      get(computedD);
      get(computedE);
      
      // Even with complex shared dependencies, should not cause infinite loop
      expect(() => {
        atomicUpdate(({ dispose }) => {
          dispose(baseCell);
        });
      }).not.toThrow();
      
      // Verify all are disposed
      expect(() => get(computedA)).toThrow();
      expect(() => get(computedB)).toThrow();
      expect(() => get(computedC)).toThrow();
      expect(() => get(computedD)).toThrow();
      expect(() => get(computedE)).toThrow();
    });

    it('should not dispose the same state multiple times', () => {
      let disposeCount = 0;
      const cell = createCell(1);
      const computedA = createComputed(({ get }) => get(cell) * 2);
      const computedB = createComputed(({ get }) => get(cell) * 3);
      const computedC = createComputed(({ get }) => get(computedA) + get(computedB));
      
      // Track dispose calls on computedC
      const originalDispose = computedC[Symbol.dispose];
      computedC[Symbol.dispose] = () => {
        disposeCount++;
        originalDispose?.call(computedC);
      };
      
      // Initialize
      get(computedC);
      
      atomicUpdate(({ dispose }) => {
        dispose(cell);
      });
      
      // computedC should be disposed only once even though
      // it can be reached from both computedA and computedB
      expect(disposeCount).toBe(1);
    });
  });

  describe('isCommitting flag interaction', () => {
    it('should skip dispose check during commit phase', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      // Initialize
      get(computed);
      
      // This test verifies the commit phase behavior
      // During commit, disposed states can still be accessed for cleanup
      atomicUpdate(({ set, dispose }) => {
        set(cell, 20);
        dispose(cell);
        // The commit phase will access the value to update stableValue
        // This should not throw due to isCommitting flag
      });
      
      // After commit, both should be disposed
      expect(() => get(cell)).toThrow();
      expect(() => get(computed)).toThrow();
    });
  });
});