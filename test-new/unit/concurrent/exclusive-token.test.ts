import { describe, it, expect } from 'vitest';
import { createCell, get, tryAtomicUpdate, createExclusiveToken } from '../../../src';
import { wait } from '../../helpers/async';

describe('ExclusiveToken', () => {
  it('should allow first update to succeed', () => {
    const token = createExclusiveToken();
    const cell = createCell(10);
    
    const result = tryAtomicUpdate(({ set }) => {
      set(cell, 20);
    }, { concurrent: token });
    
    expect(result.ok).toBe(true);
    expect(get(cell)).toBe(20);
  });

  it('should reject concurrent update immediately', async () => {
    const token = createExclusiveToken();
    const cell = createCell('initial');
    
    // Start a long-running update
    const promise1 = (async () => {
      return tryAtomicUpdate(async ({ set }) => {
        await wait(50); // Simulate long operation
        set(cell, 'first');
      }, { concurrent: token });
    })();
    
    // Try another update while first is running
    await wait(10); // Ensure first update has started
    const result2 = tryAtomicUpdate(({ set }) => {
      set(cell, 'second');
    }, { concurrent: token });
    
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.reason).toBe('Concurrent operation failed: conflict');
    }
    
    // Wait for first update to complete
    const result1 = await promise1;
    expect(result1.ok).toBe(true);
    expect(get(cell)).toBe('first');
  });

  it('should release lock after completion', () => {
    const token = createExclusiveToken();
    const cell = createCell(1);
    
    // First update
    const result1 = tryAtomicUpdate(({ set }) => {
      set(cell, 2);
    }, { concurrent: token });
    
    expect(result1.ok).toBe(true);
    
    // Second update should succeed after first completes
    const result2 = tryAtomicUpdate(({ set }) => {
      set(cell, 3);
    }, { concurrent: token });
    
    expect(result2.ok).toBe(true);
    expect(get(cell)).toBe(3);
  });

  it('should release lock after error', () => {
    const token = createExclusiveToken();
    const cell = createCell(100);
    
    // First update fails
    expect(() => {
      tryAtomicUpdate(() => {
        throw new Error('Intentional error');
      }, { concurrent: token });
    }).toThrow('Intentional error');
    
    // Second update should succeed
    const result2 = tryAtomicUpdate(({ set }) => {
      set(cell, 200);
    }, { concurrent: token });
    
    expect(result2.ok).toBe(true);
    expect(get(cell)).toBe(200);
  });

  it('should handle multiple exclusive tokens independently', async () => {
    const token1 = createExclusiveToken();
    const token2 = createExclusiveToken();
    const cellA = createCell('a');
    const cellB = createCell('b');
    
    // Start updates with different tokens (both should proceed)
    const promise1 = (async () => {
      return tryAtomicUpdate(async ({ set }) => {
        await wait(30);
        set(cellA, 'a-updated');
      }, { concurrent: token1 });
    })();
    
    const promise2 = (async () => {
      return tryAtomicUpdate(async ({ set }) => {
        await wait(30);
        set(cellB, 'b-updated');
      }, { concurrent: token2 });
    })();
    
    // Wait for both to complete
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(get(cellA)).toBe('a-updated');
    expect(get(cellB)).toBe('b-updated');
  });

  it('should work with synchronous updates', () => {
    const token = createExclusiveToken();
    const cell = createCell(0);
    
    // Multiple synchronous updates should work sequentially
    const results = [];
    for (let i = 1; i <= 5; i++) {
      const result = tryAtomicUpdate(({ set }) => {
        set(cell, i);
      }, { concurrent: token });
      results.push(result);
    }
    
    expect(results.every(r => r.ok)).toBe(true);
    expect(get(cell)).toBe(5);
  });

  it('should handle nested atomicUpdate correctly', () => {
    const token = createExclusiveToken();
    const cell = createCell(10);
    
    const result = tryAtomicUpdate((ops) => {
      ops.set(cell, 20);
      
      // Nested atomicUpdate with same context
      const nestedResult = tryAtomicUpdate(({ set }) => {
        set(cell, 30);
      }, { context: ops.context });
      
      expect(nestedResult.ok).toBe(true);
    }, { concurrent: token });
    
    expect(result.ok).toBe(true);
    expect(get(cell)).toBe(30);
  });
});