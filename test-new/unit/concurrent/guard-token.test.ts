import { describe, it, expect } from 'vitest';
import { createCell, get, tryAtomicUpdate, createGuardToken } from '../../../src';

describe('GuardToken', () => {
  it('should allow first update to succeed', () => {
    const token = createGuardToken();
    const cell = createCell(10);
    
    const result = tryAtomicUpdate(({ set }) => {
      set(cell, 20);
    }, { concurrent: token });
    
    expect(result.ok).toBe(true);
    expect(get(cell)).toBe(20);
  });

  it('should reject concurrent update when revision changes', async () => {
    const token = createGuardToken();
    const cell = createCell('initial');
    
    // Start two updates concurrently
    const promise1 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 30)); // Longer delay
      set(cell, 'first');
    }, { concurrent: token });
    
    const promise2 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Shorter delay
      set(cell, 'second');
    }, { concurrent: token });
    
    // Wait for both to complete
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    // One should succeed, one should fail
    const succeeded = [result1, result2].filter(r => r.ok).length;
    const failed = [result1, result2].filter(r => !r.ok).length;
    
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    
    // The failed one should have 'concurrent' reason
    const failedResult = [result1, result2].find(r => !r.ok);
    if (failedResult && !failedResult.ok) {
      expect(failedResult.reason).toBe('Concurrent operation failed: conflict');
    }
    
    // Cell should have one of the values
    const finalValue = get(cell);
    expect(['first', 'second'].includes(finalValue)).toBe(true);
  });

  it('should allow update after failed attempt if revision unchanged', () => {
    const token = createGuardToken();
    const cell = createCell(100);
    
    // First attempt fails due to error
    expect(() => {
      tryAtomicUpdate(() => {
        throw new Error('Intentional error');
      }, { concurrent: token });
    }).toThrow('Intentional error');
    
    // Second attempt should succeed since revision didn't change
    const result2 = tryAtomicUpdate(({ set }) => {
      set(cell, 200);
    }, { concurrent: token });
    
    expect(result2.ok).toBe(true);
    expect(get(cell)).toBe(200);
  });

  it('should handle multiple guard tokens independently', async () => {
    const token1 = createGuardToken();
    const token2 = createGuardToken();
    const cell = createCell(1);
    
    // Concurrent updates with different tokens should both succeed
    const promise1 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      set(cell, 2);
    }, { concurrent: token1 });
    
    const promise2 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      set(cell, 3);
    }, { concurrent: token2 });
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect([2,3].includes(get(cell))).toBe(true);
    
    // Both should succeed (different tokens don't interfere)
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    
    // Concurrent updates with token1 should conflict
    const promise3 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 30));
      set(cell, 4);
    }, { concurrent: token1 });
    
    const promise4 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      set(cell, 5);
    }, { concurrent: token1 });
    
    const [r1, r2] = await Promise.all([promise3, promise4]);
    const succeeded = [r1, r2].filter(r => r.ok).length;
    const failed = [r1, r2].filter(r => !r.ok).length;
    
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    
    // The failed one should have 'Concurrent operation failed: conflict' reason
    const failedResult = [r1, r2].find(r => !r.ok);
    if (failedResult && !failedResult.ok) {
      expect(failedResult.reason).toBe('Concurrent operation failed: conflict');
    }
  });

  it('should work with complex updates', async () => {
    const token = createGuardToken();
    const cellA = createCell(10);
    const cellB = createCell(20);
    const cellC = createCell(30);
    
    // First complex update
    const result1 = tryAtomicUpdate(({ set }) => {
      set(cellA, 15);
      set(cellB, 25);
      set(cellC, 35);
    }, { concurrent: token });
    
    expect(result1.ok).toBe(true);
    expect(get(cellA)).toBe(15);
    expect(get(cellB)).toBe(25);
    expect(get(cellC)).toBe(35);
    
    // Concurrent complex updates should conflict
    const promise1 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 30));
      set(cellA, 100);
      set(cellB, 200);
      set(cellC, 300);
    }, { concurrent: token });
    
    const promise2 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      set(cellA, 1000);
      set(cellB, 2000);
      set(cellC, 3000);
    }, { concurrent: token });
    
    const [r1, r2] = await Promise.all([promise1, promise2]);
    const succeeded = [r1, r2].filter(r => r.ok).length;
    const failed = [r1, r2].filter(r => !r.ok).length;
    
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    
    // Check one of the updates succeeded
    const successResult = [r1, r2].find(r => r.ok);
    const failedResult = [r1, r2].find(r => !r.ok);
    
    if (failedResult && !failedResult.ok) {
      expect(failedResult.reason).toBe('Concurrent operation failed: conflict');
    }
    
    // Values should be from the successful update
    if (successResult === r1) {
      expect(get(cellA)).toBe(100);
      expect(get(cellB)).toBe(200);
      expect(get(cellC)).toBe(300);
    } else {
      expect(get(cellA)).toBe(1000);
      expect(get(cellB)).toBe(2000);
      expect(get(cellC)).toBe(3000);
    }
  });

  it('should handle read-only operations', async () => {
    const token = createGuardToken();
    const cell = createCell(42);
    
    // Concurrent read-only operations should NOT conflict
    const promise1 = tryAtomicUpdate(async ({ get }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const value = get(cell);
      return value;
    }, { concurrent: token });
    
    const promise2 = tryAtomicUpdate(async ({ get }) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      const value = get(cell);
      return value * 2;
    }, { concurrent: token });
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    // Both should succeed (read-only operations don't conflict)
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    
    if (result1.ok) {
      expect(result1.value).toBe(42);
    }
    if (result2.ok) {
      expect(result2.value).toBe(84);
    }
    
    // Test mixed read/write operations - both should succeed
    const promise3 = tryAtomicUpdate(async ({ get }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const value = get(cell);
      return value + 1;
    }, { concurrent: token });
    
    const promise4 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      set(cell, 100);
    }, { concurrent: token });
    
    const [result3, result4] = await Promise.all([promise3, promise4]);
    
    // Both should succeed (read doesn't conflict with write)
    expect(result3.ok).toBe(true);
    expect(result4.ok).toBe(true);
    
    if (result3.ok) {
      expect(result3.value).toBe(43); // 42 + 1
    }
    expect(get(cell)).toBe(100); // Write operation succeeded
    
    // Test write/write operations - one should fail
    const promise5 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      set(cell, 200);
    }, { concurrent: token });
    
    const promise6 = tryAtomicUpdate(async ({ set }) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      set(cell, 300);
    }, { concurrent: token });
    
    const [result5, result6] = await Promise.all([promise5, promise6]);
    
    // One should succeed, one should fail (write vs write)
    const succeeded = [result5, result6].filter(r => r.ok).length;
    const failed = [result5, result6].filter(r => !r.ok).length;
    
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    
    const failedResult = [result5, result6].find(r => !r.ok);
    if (failedResult && !failedResult.ok) {
      expect(failedResult.reason).toBe('Concurrent operation failed: conflict');
    }
    
    // Cell should have value from successful write
    expect([200, 300].includes(get(cell))).toBe(true);
  });
});