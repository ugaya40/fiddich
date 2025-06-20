import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, atomicUpdate, Computed, Cell } from '../src';

describe('Circular dependency detection', () => {
  it('should detect non-convergent circular dependency', () => {
    const cellA = createCell(1);
    const cellB = createCell(2);
    const controlCell = createCell(true);
    
    const computedA: Computed<number> = createComputed(({ get }) => {
      const useCell = get(controlCell);
      return useCell ? get(cellA) : get(computedB);
    });
    
    const computedB: Computed<number> = createComputed(({ get }) => {
      return get(cellB) + get(computedA);
    });
    
    // Initialize - should work fine
    expect(get(computedB)).toBe(3); // 2 + 1
    
    // Create circular dependency - should throw
    expect(() => {
      atomicUpdate((ops) => {
        ops.set(controlCell, false);
        ops.get(computedB); // This should trigger circular dependency error
      });
    }).toThrow('Circular dependency detected');
  });
  
  it('should allow deep non-circular dependencies', () => {
    const cell = createCell(1);
    
    // Create a deep chain
    let prev: Cell<number> | Computed<number> = cell;
    const computeds: Computed<number>[] = [];
    
    for (let i = 0; i < 20; i++) {
      const currentPrev = prev;
      const computed: Computed<number> = createComputed(({ get }) => get(currentPrev) + 1);
      computeds.push(computed);
      prev = computed;
    }
    
    // This should work without throwing
    expect(() => {
      atomicUpdate((ops) => {
        ops.set(cell, 2);
        const result = ops.get(computeds[19]);
        expect(result).toBe(22); // 2 + 20
      });
    }).not.toThrow();
  });
});