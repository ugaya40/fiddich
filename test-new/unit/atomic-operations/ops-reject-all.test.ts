import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, atomicUpdate, set } from '../../../src';
import { createDisposable } from '../../helpers';

describe('atomicUpdate - ops.rejectAllChanges', () => {
  it('should discard all value changes', () => {
    const cellA = createCell(1);
    const cellB = createCell('initial');
    const cellC = createCell(true);
    
    atomicUpdate(({ get, set, rejectAllChanges }) => {
      // Make some changes
      set(cellA, 100);
      set(cellB, 'changed');
      set(cellC, false);
      
      // Verify changes are visible within transaction
      expect(get(cellA)).toBe(100);
      expect(get(cellB)).toBe('changed');
      expect(get(cellC)).toBe(false);
      
      // Reject all changes
      rejectAllChanges();
      
      // Values should be reset within transaction
      expect(get(cellA)).toBe(1);
      expect(get(cellB)).toBe('initial');
      expect(get(cellC)).toBe(true);
    });
    
    // Values should remain unchanged after transaction
    expect(get(cellA)).toBe(1);
    expect(get(cellB)).toBe('initial');
    expect(get(cellC)).toBe(true);
  });

  it('should clear toDispose set', () => {
    const { disposable: oldValue, disposed: oldDisposed } = createDisposable('old');
    const { disposable: newValue, disposed: newDisposed } = createDisposable('new');
    
    const cell = createCell(oldValue);
    
    atomicUpdate(({ set, rejectAllChanges }) => {
      // This would normally queue oldValue for disposal
      set(cell, newValue);
      
      // Reject changes
      rejectAllChanges();
    });
    
    // oldValue should NOT have been disposed
    expect(oldDisposed).not.toHaveBeenCalled();
    expect(newDisposed).not.toHaveBeenCalled();
    expect(get(cell)).toBe(oldValue);
  });

  it('should clear scheduled dispose operations', () => {
    const { disposable, disposed } = createDisposable();
    const cell = createCell(disposable);
    
    atomicUpdate(({ dispose, rejectAllChanges }) => {
      // Schedule disposal
      dispose(cell);
      
      // Reject changes
      rejectAllChanges();
    });
    
    // Disposal should not have occurred
    expect(disposed).not.toHaveBeenCalled();
  });

  it('should allow new changes after rejectAllChanges', () => {
    const cell = createCell(10);
    
    atomicUpdate(({ get, set, rejectAllChanges }) => {
      // First round of changes
      set(cell, 20);
      expect(get(cell)).toBe(20);
      
      // Reject
      rejectAllChanges();
      expect(get(cell)).toBe(10);
      
      // Second round of changes
      set(cell, 30);
      expect(get(cell)).toBe(30);
    });
    
    // Second round changes should be committed
    expect(get(cell)).toBe(30);
  });

  it('should handle multiple rejectAllChanges calls', () => {
    const cell = createCell('start');
    
    atomicUpdate(({ get, set, rejectAllChanges }) => {
      set(cell, 'first');
      expect(get(cell)).toBe('first');
      
      rejectAllChanges();
      expect(get(cell)).toBe('start');
      
      set(cell, 'second');
      expect(get(cell)).toBe('second');
      
      rejectAllChanges();
      expect(get(cell)).toBe('start');
      
      set(cell, 'third');
      expect(get(cell)).toBe('third');
    });
    
    expect(get(cell)).toBe('third');
  });

  it('should reset computed dependencies correctly', () => {
    const useA = createCell(true);
    const cellA = createCell(10);
    const cellB = createCell(20);
    let computationCount = 0;
    
    const computed = createComputed(({ get }) => {
      computationCount++;
      // Conditional dependency
      return get(useA) ? get(cellA) : get(cellB);
    });
    
    // Initial computation - depends on cellA
    expect(get(computed)).toBe(10);
    expect(computationCount).toBe(1);
    
    atomicUpdate(({ get, set, rejectAllChanges }) => {
      // Change dependency from cellA to cellB
      set(useA, false);
      
      // Now depends on cellB
      expect(get(computed)).toBe(20);
      expect(computationCount).toBe(2);
      
      // Change cellB value
      set(cellB, 30);
      expect(get(computed)).toBe(30);
      expect(computationCount).toBe(3);
      
      // Change unused cellA - should not trigger recomputation
      set(cellA, 100);
      expect(get(computed)).toBe(30);
      expect(computationCount).toBe(3);
      
      rejectAllChanges();
      
      // Should be back to depending on cellA with original value
      expect(get(computed)).toBe(10);
    });
    
    // Verify dependency is back to cellA
    expect(get(computed)).toBe(10);
    
    // Change cellB - should not affect computed
    set(cellB, 50);
    expect(get(computed)).toBe(10);
    expect(computationCount).toBe(3); // No new computation
    
    // Change cellA - should affect computed
    set(cellA, 15);
    expect(get(computed)).toBe(15);
    expect(computationCount).toBe(4); // New computation
  });

  it('should handle complex scenarios with conditionals', () => {
    const mode = createCell<'add' | 'multiply'>('add');
    const a = createCell(5);
    const b = createCell(3);
    
    const result = createComputed(({ get }) => {
      const op = get(mode);
      return op === 'add' ? get(a) + get(b) : get(a) * get(b);
    });
    
    atomicUpdate(({ get, set, rejectAllChanges }) => {
      expect(get(result)).toBe(8); // 5 + 3
      
      set(mode, 'multiply');
      expect(get(result)).toBe(15); // 5 * 3
      
      set(a, 10);
      expect(get(result)).toBe(30); // 10 * 3
      
      // Decide to revert everything
      rejectAllChanges();
      
      expect(get(result)).toBe(8); // Back to 5 + 3
    });
    
    expect(get(mode)).toBe('add');
    expect(get(a)).toBe(5);
    expect(get(b)).toBe(3);
    expect(get(result)).toBe(8);
  });
});