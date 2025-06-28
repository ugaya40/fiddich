import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../../../src';

describe('resource-management', () => {
  it('should remove from dependency graph on dispose', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    // Initial state
    expect(get(computed)).toBe(20);
    
    // Change cell - computed should update
    set(cell, 15);
    expect(get(computed)).toBe(30);
    
    // Dispose computed
    computed[Symbol.dispose]();
    
    // After dispose, changing cell should not affect disposed computed
    set(cell, 20);
    
    // Accessing disposed computed should throw
    expect(() => {
      get(computed);
    }).toThrow();
  });

  it('should clean up dependent relationships', () => {
    const cellA = createCell(1);
    const cellB = createCell(2);
    
    // Create a chain: cellA -> computedA -> computedB
    const computedA = createComputed(({ get }) => get(cellA) + 10);
    
    let computedBChanges = 0;
    const computedB = createComputed(({ get }) => get(computedA) + get(cellB), {
      onChange: () => computedBChanges++
    });
    
    // Verify initial relationships work
    expect(get(computedA)).toBe(11);
    expect(get(computedB)).toBe(13);
    
    // Dispose computedA (middle of the chain)
    computedA[Symbol.dispose]();
    
    // computedB is also disposed due to chain disposal
    expect(() => {
      get(computedB);
    }).toThrow();
    
    // Changes to cellA don't matter since dependent chain is disposed
    set(cellA, 100);
    expect(computedBChanges).toBe(0);
  });

  it('should handle dispose during transaction', () => {
    const cell1 = createCell(10);
    const cell2 = createCell(20);
    const computed1 = createComputed(({ get }) => get(cell1) * 2);
    const computed2 = createComputed(({ get }) => get(cell2) * 3);
    
    // Initial values
    expect(get(computed1)).toBe(20);
    expect(get(computed2)).toBe(60);
    
    // Dispose during transaction
    atomicUpdate(({ get: opGet, set, dispose: opDispose }) => {
      // Make changes
      set(cell1, 15);
      set(cell2, 25);
      
      // Values updated within transaction
      expect(opGet(computed1)).toBe(30);
      expect(opGet(computed2)).toBe(75);
      
      // Schedule dispose
      opDispose(computed1);
      
      // After dispose, cannot access within transaction
      expect(() => opGet(computed1)).toThrow();
    });
    
    // After commit, computed1 is disposed
    expect(() => {
      get(computed1);
    }).toThrow();
    
    // computed2 still works
    expect(get(computed2)).toBe(75);
    
    // cell1 changes don't affect anything
    set(cell1, 100);
    // No error, just disposed computed is not recomputed
  });

  it('should dispose computed with multiple dependencies', () => {
    const cellA = createCell(1);
    const cellB = createCell(2);
    const cellC = createCell(3);
    
    // Computed depending on all three cells
    const multiDepComputed = createComputed(({ get }) => {
      return get(cellA) + get(cellB) + get(cellC);
    });
    
    // Another computed depending on multiDepComputed
    let dependentChanges = 0;
    const dependent = createComputed(({ get }) => get(multiDepComputed) * 10, {
      onChange: () => dependentChanges++
    });
    
    // Initialize
    expect(get(multiDepComputed)).toBe(6);
    expect(get(dependent)).toBe(60);
    
    // Verify dependencies work
    set(cellA, 10);
    expect(get(multiDepComputed)).toBe(15);
    expect(get(dependent)).toBe(150);
    expect(dependentChanges).toBe(1);
    
    // Dispose multiDepComputed
    multiDepComputed[Symbol.dispose]();
    
    // Should not be accessible
    expect(() => {
      get(multiDepComputed);
    }).toThrow();
    
    // Dependent computed should also fail
    expect(() => {
      get(dependent);
    }).toThrow();
    
    // Changes to any source cell should not trigger anything
    const previousChanges = dependentChanges;
    set(cellA, 20);
    set(cellB, 30);
    set(cellC, 40);
    expect(dependentChanges).toBe(previousChanges);
    
  });

  it('should dispose entire dependency chain when disposing cell', () => {
    // Create a longer chain: cellA -> computedB -> computedC -> computedD
    const cellA = createCell(1);
    const computedB = createComputed(({ get }) => get(cellA) * 2);
    const computedC = createComputed(({ get }) => get(computedB) + 10);
    const computedD = createComputed(({ get }) => get(computedC) * 3);
    
    // Verify chain works by accessing the farthest computed
    expect(get(computedD)).toBe(36); // ((1 * 2) + 10) * 3
    
    // Dispose the root cell
    cellA[Symbol.dispose]();
    
    // The farthest computed should be disposed due to chain disposal
    expect(() => get(computedD)).toThrow();
    
    // Verify intermediate computeds are also disposed
    expect(() => get(computedC)).toThrow();
    expect(() => get(computedB)).toThrow();
  });

  it('should handle chain disposal in atomicUpdate', () => {
    // Create a complex graph: cellA -> computedB -> computedC -> computedD
    const cellA = createCell(10);
    const computedB = createComputed(({ get }) => get(cellA) + 1);
    const computedC = createComputed(({ get }) => get(computedB) * 2);
    const computedD = createComputed(({ get }) => get(computedC) + 100);
    
    // Initial values - access from farthest
    expect(get(computedD)).toBe(122); // ((10 + 1) * 2) + 100
    
    atomicUpdate(({ get: opGet, dispose }) => {
      // Can still access the farthest computed within transaction
      expect(opGet(computedD)).toBe(122);
      
      // Dispose cellA - this will chain dispose all dependents
      dispose(cellA);
      
      // After dispose, all chain members cannot be accessed within transaction
      expect(() => opGet(computedD)).toThrow();
      expect(() => opGet(computedC)).toThrow();
      expect(() => opGet(computedB)).toThrow();
      expect(() => opGet(cellA)).toThrow();
    });
    
    // After commit, accessing the farthest computed should fail
    expect(() => get(computedD)).toThrow();
    
    // Verify entire chain is disposed
    expect(() => get(computedC)).toThrow();
    expect(() => get(computedB)).toThrow();
    expect(() => get(cellA)).toThrow();
  });
});