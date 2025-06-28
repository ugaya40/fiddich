import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, atomicUpdate, Computed } from '../../../src';

describe('circular-dependency', () => {
  it('should detect simple circular dependency', () => {
    const cellA = createCell(1);
    let computedB: Computed<number>;
    
    // A → B → A
    const computedA = createComputed(({ get }) => {
      return get(cellA) + (computedB ? get(computedB) : 0);
    });
    
    computedB = createComputed(({ get }) => {
      return get(computedA) * 2;
    });
    
    // Should throw when trying to get
    expect(() => {
      get(computedA);
    }).toThrow();
    
    // Error message should indicate circular dependency
    expect(() => {
      get(computedB);
    }).toThrow(/circular/i);
  });

  it('should detect indirect circular dependency', () => {
    const base = createCell(10);
    
    // A → B → C → A
    let computedC: Computed<number>;
    
    const computedA = createComputed(({ get }) => {
      return get(base) + (computedC ? get(computedC) : 0);
    });
    
    const computedB = createComputed(({ get }) => {
      return get(computedA) * 2;
    });
    
    computedC = createComputed(({ get }) => {
      return get(computedB) + 5;
    });
    
    // Should detect the circular dependency
    expect(() => {
      get(computedA);
    }).toThrow(/circular/i);
    
    // All nodes in the cycle should throw
    expect(() => {
      get(computedB);
    }).toThrow(/circular/i);
    
    expect(() => {
      get(computedC);
    }).toThrow(/circular/i);
  });

  it('should detect self-referencing computed', () => {
    let selfRef: Computed<number>;
    
    selfRef = createComputed(({ get }) => {
      // Try to reference itself
      return get(selfRef) + 1;
    });
    
    // Should throw immediately when accessed
    expect(() => {
      get(selfRef);
    }).toThrow(/circular/i);
  });

  it('should detect dynamic circular dependency', () => {
    const toggle = createCell(false);
    const cellValue = createCell(1);
    
    let computedB: Computed<number>;
    
    // Dynamic dependency based on toggle
    const computedA = createComputed(({ get }) => {
      if (get(toggle)) {
        // When toggle is true, create circular dependency
        return get(computedB) + 1;
      } else {
        // When toggle is false, no circular dependency
        return get(cellValue) * 2;
      }
    });
    
    computedB = createComputed(({ get }) => {
      return get(computedA) * 3;
    });
    
    // Initially no circular dependency (toggle is false)
    expect(get(computedA)).toBe(2); // cellValue(1) * 2
    expect(get(computedB)).toBe(6); // computedA(2) * 3
    
    // Create circular dependency by changing toggle
    expect(() => {
      atomicUpdate(({ set }) => {
        set(toggle, true);
        // This should trigger circular dependency detection
        get(computedA);
      });
    }).toThrow(/circular/i);
    
    // Values should remain unchanged after failed update
    expect(get(toggle)).toBe(false);
    expect(get(computedA)).toBe(2);
    expect(get(computedB)).toBe(6);
  });
});