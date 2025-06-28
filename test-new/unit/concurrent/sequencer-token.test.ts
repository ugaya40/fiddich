import { describe, it, expect } from 'vitest';
import { createCell, get, atomicUpdate, createSequencerToken } from '../../../src';
import { wait } from '../../helpers/async';

describe('SequencerToken', () => {
  it('should execute updates sequentially', async () => {
    const token = createSequencerToken();
    const cell = createCell<number[]>([]);
    const results: number[] = [];
    
    // Launch multiple async updates
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        atomicUpdate(async ({ get, set }) => {
          results.push(i); // Track execution order
          const current = get(cell);
          await wait(Math.random() * 20); // Random delay
          set(cell, [...current, i]);
        }, { concurrent: token })
      );
    }
    
    // Wait for all to complete
    await Promise.all(promises);
    
    // Should execute in order
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(get(cell)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle errors without blocking queue', async () => {
    const token = createSequencerToken();
    const cell = createCell('initial');
    const executionOrder: string[] = [];
    
    // First update
    const promise1 = atomicUpdate(async ({ set }) => {
      executionOrder.push('start-1');
      await wait(20);
      set(cell, 'first');
      executionOrder.push('end-1');
    }, { concurrent: token });
    
    // Second update (will fail)
    const promise2 = atomicUpdate(async () => {
      executionOrder.push('start-2');
      await wait(20);
      throw new Error('Intentional error');
    }, { concurrent: token });
    
    // Third update
    const promise3 = atomicUpdate(async ({ set }) => {
      executionOrder.push('start-3');
      await wait(20);
      set(cell, 'third');
      executionOrder.push('end-3');
    }, { concurrent: token });
    
    // Wait for all
    await promise1;
    await expect(promise2).rejects.toThrow('Intentional error');
    await promise3;
    
    // Should execute in order despite error
    expect(executionOrder).toEqual(['start-1', 'end-1', 'start-2', 'start-3', 'end-3']);
    expect(get(cell)).toBe('third');
  });

  it('should work with synchronous updates', async () => {
    const token = createSequencerToken();
    const cell = createCell(0);
    
    // Mix of sync and async updates
    const promises = [];
    
    promises.push(
      atomicUpdate(({ set }) => {
        set(cell, 1);
      }, { concurrent: token })
    );
    
    promises.push(
      atomicUpdate(async ({ set }) => {
        await wait(10);
        set(cell, 2);
      }, { concurrent: token })
    );
    
    promises.push(
      atomicUpdate(({ set }) => {
        set(cell, 3);
      }, { concurrent: token })
    );
    
    await Promise.all(promises);
    expect(get(cell)).toBe(3);
  });

  it('should handle multiple sequencer tokens independently', async () => {
    const token1 = createSequencerToken();
    const token2 = createSequencerToken();
    const cellA = createCell<string[]>([]);
    const cellB = createCell<string[]>([]);
    
    // Updates with token1
    const promisesA = [];
    for (let i = 1; i <= 3; i++) {
      promisesA.push(
        atomicUpdate(async ({ get, set }) => {
          const current = get(cellA);
          await wait(30 - i * 5); // Decreasing delays
          set(cellA, [...current, `A${i}`]);
        }, { concurrent: token1 })
      );
    }
    
    // Updates with token2
    const promisesB = [];
    for (let i = 1; i <= 3; i++) {
      promisesB.push(
        atomicUpdate(async ({ get, set }) => {
          const current = get(cellB);
          await wait(i * 5); // Increasing delays
          set(cellB, [...current, `B${i}`]);
        }, { concurrent: token2 })
      );
    }
    
    // Wait for all
    await Promise.all([...promisesA, ...promisesB]);
    
    // Each token maintains its own order
    expect(get(cellA)).toEqual(['A1', 'A2', 'A3']);
    expect(get(cellB)).toEqual(['B1', 'B2', 'B3']);
  });

  it('should handle complex dependency updates', async () => {
    const token = createSequencerToken();
    const counter = createCell(0);
    const log = createCell<string[]>([]);
    
    const promises = [];
    
    // Multiple updates that depend on previous state
    for (let i = 1; i <= 5; i++) {
      promises.push(
        atomicUpdate(async ({ get, set }) => {
          const currentCount = get(counter);
          const currentLog = get(log);
          
          await wait(10);
          
          set(counter, currentCount + i);
          set(log, [...currentLog, `Added ${i}, total: ${currentCount + i}`]);
        }, { concurrent: token })
      );
    }
    
    await Promise.all(promises);
    
    expect(get(counter)).toBe(15); // 1+2+3+4+5
    expect(get(log)).toEqual([
      'Added 1, total: 1',
      'Added 2, total: 3',
      'Added 3, total: 6',
      'Added 4, total: 10',
      'Added 5, total: 15'
    ]);
  });

  it('should maintain order even with immediate resolution', async () => {
    const token = createSequencerToken();
    const cell = createCell<number[]>([]);
    
    // All updates resolve immediately
    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(
        atomicUpdate(({ get, set }) => {
          const current = get(cell);
          set(cell, [...current, i]);
        }, { concurrent: token })
      );
    }
    
    await Promise.all(promises);
    
    expect(get(cell)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});