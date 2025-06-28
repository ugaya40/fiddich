import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../../../src';
import { createDisposable } from '../../helpers';

describe('transaction-atomicity', () => {
  it('should rollback all changes on error', () => {
    const cell1 = createCell(10);
    const cell2 = createCell('initial');
    const cell3 = createCell(true);
    
    const computed = createComputed(({ get }) => {
      return `${get(cell1)}-${get(cell2)}-${get(cell3)}`;
    });
    
    // Initial state
    expect(get(cell1)).toBe(10);
    expect(get(cell2)).toBe('initial');
    expect(get(cell3)).toBe(true);
    expect(get(computed)).toBe('10-initial-true');
    
    // Transaction that will fail
    expect(() => {
      atomicUpdate(({ get, set }) => {
        set(cell1, 20);
        set(cell2, 'changed');
        set(cell3, false);
        
        // Verify changes are visible within transaction
        expect(get(cell1)).toBe(20);
        expect(get(cell2)).toBe('changed');
        expect(get(cell3)).toBe(false);
        
        // Throw error to trigger rollback
        throw new Error('Transaction failed');
      });
    }).toThrow('Transaction failed');
    
    // All values should be rolled back
    expect(get(cell1)).toBe(10);
    expect(get(cell2)).toBe('initial');
    expect(get(cell3)).toBe(true);
    expect(get(computed)).toBe('10-initial-true');
  });

  it('should rollback complex state changes', () => {
    // Create interconnected cells and computeds
    const base = createCell(1);
    const multiplier = createCell(2);
    
    let productChanges = 0;
    let doubledChanges = 0;
    
    const product = createComputed(({ get }) => get(base) * get(multiplier), {
      onChange: () => productChanges++
    });
    const doubled = createComputed(({ get }) => get(product) * 2, {
      onChange: () => doubledChanges++
    });
    const summary = createComputed(({ get }) => {
      return `base: ${get(base)}, product: ${get(product)}, doubled: ${get(doubled)}`;
    });
    
    // Initial computation
    expect(get(product)).toBe(2);
    expect(get(doubled)).toBe(4);
    expect(get(summary)).toBe('base: 1, product: 2, doubled: 4');
    
    // Complex transaction that fails
    expect(() => {
      atomicUpdate(({ get, set }) => {
        // Make multiple changes
        set(base, 5);
        expect(get(product)).toBe(10);
        expect(get(doubled)).toBe(20);
        
        set(multiplier, 3);
        expect(get(product)).toBe(15);
        expect(get(doubled)).toBe(30);
        
        // Change base again
        set(base, 10);
        expect(get(product)).toBe(30);
        expect(get(doubled)).toBe(60);
        
        // Fail the transaction
        throw new Error('Complex transaction failed');
      });
    }).toThrow('Complex transaction failed');
    
    // Everything should be rolled back
    expect(get(base)).toBe(1);
    expect(get(multiplier)).toBe(2);
    expect(get(product)).toBe(2);
    expect(get(doubled)).toBe(4);
    expect(get(summary)).toBe('base: 1, product: 2, doubled: 4');
    
    // onChange should NOT have been triggered because transaction failed
    // Changes were never committed, so onChange callbacks were never called
    expect(productChanges).toBe(0);
    expect(doubledChanges).toBe(0);
  });

  it('should rollback dispose operations on error', () => {
    const { disposable: disposable1, disposed: disposed1 } = createDisposable('item1');
    const { disposable: disposable2, disposed: disposed2 } = createDisposable('item2');
    const { disposable: disposable3, disposed: disposed3 } = createDisposable('item3');
    
    const cell1 = createCell(disposable1);
    const cell2 = createCell(disposable2);
    
    // Transaction that schedules disposals then fails
    expect(() => {
      atomicUpdate(({ get, set, dispose }) => {
        // Schedule disposal of cell1's value
        set(cell1, disposable3);
        expect(disposed1).not.toHaveBeenCalled(); // Not disposed yet
        
        // Schedule direct disposal
        dispose(cell2);
        expect(disposed2).not.toHaveBeenCalled(); // Not disposed yet
        
        // Verify new value is set
        expect(get(cell1)).toBe(disposable3);
        
        // Fail the transaction
        throw new Error('Disposal rollback test');
      });
    }).toThrow('Disposal rollback test');
    
    // No disposals should have occurred
    expect(disposed1).not.toHaveBeenCalled();
    expect(disposed2).not.toHaveBeenCalled();
    expect(disposed3).not.toHaveBeenCalled();
    
    // Original values should be intact
    expect(get(cell1)).toBe(disposable1);
    expect(get(cell2)).toBe(disposable2);
    
    // Verify disposables still work (not disposed)
    disposed1();
    disposed2();
    expect(disposed1).toHaveBeenCalledTimes(1);
    expect(disposed2).toHaveBeenCalledTimes(1);
  });

  it('should maintain consistency after failed transaction', () => {
    const cellA = createCell(1);
    const cellB = createCell(2);
    const cellC = createCell(3);
    
    // Create a complex dependency graph with onChange tracking
    let sumABChanges = 0;
    let sumBCChanges = 0;
    let totalChanges = 0;
    
    const sumAB = createComputed(({ get }) => get(cellA) + get(cellB), {
      onChange: () => sumABChanges++
    });
    const sumBC = createComputed(({ get }) => get(cellB) + get(cellC), {
      onChange: () => sumBCChanges++
    });
    const total = createComputed(({ get }) => get(sumAB) + get(sumBC) + get(cellC), {
      onChange: () => totalChanges++
    });
    
    // Initialize
    expect(get(sumAB)).toBe(3);
    expect(get(sumBC)).toBe(5);
    expect(get(total)).toBe(11);
    
    // Failed transaction
    expect(() => {
      atomicUpdate(({ get, set }) => {
        set(cellA, 10);
        set(cellB, 20);
        set(cellC, 30);
        
        // Verify intermediate state
        expect(get(sumAB)).toBe(30);
        expect(get(sumBC)).toBe(50);
        expect(get(total)).toBe(110);
        
        throw new Error('Consistency test failure');
      });
    }).toThrow('Consistency test failure');
    
    // All values should be back to original
    expect(get(cellA)).toBe(1);
    expect(get(cellB)).toBe(2);
    expect(get(cellC)).toBe(3);
    expect(get(sumAB)).toBe(3);
    expect(get(sumBC)).toBe(5);
    expect(get(total)).toBe(11);
    
    // Verify the dependency graph still works correctly
    set(cellB, 4);
    expect(get(sumAB)).toBe(5);
    expect(get(sumBC)).toBe(7);
    expect(get(total)).toBe(15);
    
    // onChange should have been triggered
    expect(sumABChanges).toBeGreaterThan(0);
    expect(sumBCChanges).toBeGreaterThan(0);
    expect(totalChanges).toBeGreaterThan(0);
    
    // Test another transaction to ensure everything still works
    atomicUpdate(({ set }) => {
      set(cellA, 2);
      set(cellB, 3);
      set(cellC, 4);
    });
    
    expect(get(sumAB)).toBe(5);
    expect(get(sumBC)).toBe(7);
    expect(get(total)).toBe(16);
  });
});