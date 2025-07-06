import { describe, it, expect, vi } from 'vitest';
import { Computed, createCell, createComputed, get, set, atomicUpdate, touch, pending } from '../src';
import { CircularDependencyError } from '../src/errors';

describe('Computed basic operations', () => {
  it('should create computed with simple calculation', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    expect(get(computed)).toBe(20);
  });

  it('should update when dependency changes', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    expect(get(computed)).toBe(20);
    set(cell, 20);
    expect(get(computed)).toBe(40);
  });

  it('should handle multiple dependencies', () => {
    const cellA = createCell(10);
    const cellB = createCell(20);
    const computed = createComputed(({ get }) => get(cellA) + get(cellB));
    
    expect(get(computed)).toBe(30);
    set(cellA, 15);
    expect(get(computed)).toBe(35);
    set(cellB, 25);
    expect(get(computed)).toBe(40);
  });

  it('should handle chained computeds', () => {
    const cell = createCell(10);
    const computed1 = createComputed(({ get }) => get(cell) * 2);
    const computed2 = createComputed(({ get }) => get(computed1) + 5);
    
    expect(get(computed2)).toBe(25);
    set(cell, 20);
    expect(get(computed2)).toBe(45);
  });

  it('should handle diamond dependency', () => {
    const cell = createCell(10);
    const computed1 = createComputed(({ get }) => get(cell) * 2);
    const computed2 = createComputed(({ get }) => get(cell) * 3);
    const computed3 = createComputed(({ get }) => get(computed1) + get(computed2));
    
    expect(get(computed3)).toBe(50); // 20 + 30
    set(cell, 20);
    expect(get(computed3)).toBe(100); // 40 + 60
  });

  it('should only recompute when necessary (pull-based)', () => {
    const cell = createCell(10);
    const computeFn = vi.fn(({ get }) => get(cell) * 2);
    const computed = createComputed(computeFn);
    
    // Initial computation
    expect(get(computed)).toBe(20);
    expect(computeFn).toHaveBeenCalledTimes(1);
    
    // Same get should not recompute
    expect(get(computed)).toBe(20);
    expect(computeFn).toHaveBeenCalledTimes(1);
    
    // After set, should recompute on next get
    set(cell, 15);
    expect(get(computed)).toBe(30);
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  it('should handle conditional dependencies', () => {
    const condition = createCell(true);
    const cellA = createCell(10);
    const cellB = createCell(20);
    
    const computed = createComputed(({ get }) => {
      if (get(condition)) {
        return get(cellA);
      } else {
        return get(cellB);
      }
    });
    
    expect(get(computed)).toBe(10);
    
    set(condition, false);
    expect(get(computed)).toBe(20);
    
    // Changing cellA should not affect computed when condition is false
    set(cellA, 100);
    expect(get(computed)).toBe(20);
  });

  it('should handle computed returning objects', () => {
    const name = createCell('John');
    const age = createCell(25);
    const computed = createComputed(({ get }) => ({
      name: get(name),
      age: get(age)
    }));
    
    expect(get(computed)).toEqual({ name: 'John', age: 25 });
    set(name, 'Jane');
    expect(get(computed)).toEqual({ name: 'Jane', age: 25 });
  });

  it('should handle computed returning arrays', () => {
    const cell1 = createCell(1);
    const cell2 = createCell(2);
    const cell3 = createCell(3);
    const computed = createComputed(({ get }) => [get(cell1), get(cell2), get(cell3)]);
    
    expect(get(computed)).toEqual([1, 2, 3]);
    set(cell2, 20);
    expect(get(computed)).toEqual([1, 20, 3]);
  });

  it('should detect circular dependency', () => {
    let computed1: Computed<number>;
    computed1 = createComputed<number>(({ get }) => {
      return get(computed2) + 1; // Forward reference
    });
    const computed2 = createComputed<number>(({ get }) => {
      return get(computed1) + 1;
    });
    
    expect(() => get(computed1)).toThrow(CircularDependencyError);
  });

  it('should handle null and undefined returns', () => {
    const cell = createCell(true);
    const computed = createComputed(({ get }) => {
      return get(cell) ? null : undefined;
    });
    
    expect(get(computed)).toBe(null);
    set(cell, false);
    expect(get(computed)).toBe(undefined);
  });

  it('should handle complex dependency chains', () => {
    const base = createCell(1);
    const level1a = createComputed(({ get }) => get(base) * 2);
    const level1b = createComputed(({ get }) => get(base) * 3);
    const level2a = createComputed(({ get }) => get(level1a) + get(level1b));
    const level2b = createComputed(({ get }) => get(level1a) * get(level1b));
    const level3 = createComputed(({ get }) => get(level2a) + get(level2b));
    
    expect(get(level3)).toBe(11); // (2 + 3) + (2 * 3) = 5 + 6 = 11
    set(base, 2);
    expect(get(level3)).toBe(34); // (4 + 6) + (4 * 6) = 10 + 24 = 34
  });
});

describe('Computed touch', () => {
  it('should trigger onNotify for computed', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10);
    const computed = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify }
    );
    
    // Initial get
    expect(get(computed)).toBe(20);
    expect(onNotify).not.toHaveBeenCalled();
    
    // Touch should trigger notification
    touch(computed);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
    
    // Value should remain the same
    expect(get(computed)).toBe(20);
  });
  
  it('should propagate touch to dependents', async () => {
    const onNotifyParent = vi.fn();
    const onNotifyChild = vi.fn();
    
    const cell = createCell(10);
    const parent = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify: onNotifyParent }
    );
    const child = createComputed(
      ({ get }) => get(parent) + 5,
      { onNotify: onNotifyChild }
    );
    
    // Initial evaluation
    expect(get(child)).toBe(25);
    
    // Touch parent should notify both parent and child
    touch(parent);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotifyParent).toHaveBeenCalledTimes(1);
    expect(onNotifyChild).toHaveBeenCalledTimes(1);
  });
  
  it('should handle touch in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10);
    const computed = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify }
    );
    
    expect(get(computed)).toBe(20);
    
    atomicUpdate((ops) => {
      ops.set(cell, 20);
      ops.touch(computed);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Should be notified once (from set, not from touch due to deduplication)
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(computed)).toBe(40);
  });
});

describe('Computed dispose', () => {
  it('should mark computed as disposed', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    expect(get(computed)).toBe(20);
    
    computed[Symbol.dispose]();
    
    expect(() => get(computed)).toThrow('Cannot access disposed state');
  });
  
  it('should trigger onNotify when disposed', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10);
    const computed = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify }
    );
    
    expect(get(computed)).toBe(20);
    
    computed[Symbol.dispose]();
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
  });
  
  it('should remove computed from dependencies when disposed', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    const dependent = createComputed(({ get }) => get(computed) + 5);
    
    // Establish dependencies
    expect(get(dependent)).toBe(25);
    expect(cell.dependents.has(computed)).toBe(true);
    expect(computed.dependents.has(dependent)).toBe(true);
    
    // Dispose computed
    computed[Symbol.dispose]();
    
    // Computed should be removed from cell's dependents
    expect(cell.dependents.has(computed)).toBe(false);
    // But dependent relationship remains until dependent is re-evaluated
    expect(computed.dependents.has(dependent)).toBe(true);
  });
  
  it('should handle dispose in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10);
    const computed = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify }
    );
    const dependent = createComputed(({ get }) => get(computed) + 5);
    
    expect(get(dependent)).toBe(25);
    
    atomicUpdate((ops) => {
      ops.dispose(computed);
      ops.set(cell, 20);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Computed should be disposed
    expect(() => get(computed)).toThrow('Cannot access disposed state');
    // Should have been notified
    expect(onNotify).toHaveBeenCalledTimes(1);
    // Dependent should error when trying to access disposed computed
    expect(() => get(dependent)).toThrow('Cannot access disposed state');
  });
});

describe('Computed pending', () => {
  it('should mark computed as dirty when pending is set', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    // Initial evaluation
    expect(get(computed)).toBe(20);
    expect(computed.isDirty).toBe(false);
    
    const promise = Promise.resolve(30);
    pending(computed, promise);
    
    // Computed should be marked dirty
    expect(computed.isDirty).toBe(true);
    expect(computed.pendingPromise).toBe(promise);
  });
  
  it('should propagate pending from dependencies', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    const dependent = createComputed(({ get }) => get(computed) + 5);
    
    // Establish dependencies
    expect(get(dependent)).toBe(25);
    
    const promise = Promise.resolve(30);
    pending(cell, promise);
    
    // Computed should be dirty
    expect(computed.isDirty).toBe(true);
    
    // When computed is re-evaluated, it should pick up cell's pending
    expect(get(computed)).toBe(20);
    expect(computed.pendingPromise).toBeDefined();
    expect(computed.pendingPromise).toBeInstanceOf(Promise);
    
    // Dependent should also pick up the pending when evaluated
    expect(get(dependent)).toBe(25);
    expect(dependent.pendingPromise).toBeDefined();
    expect(dependent.pendingPromise).toBeInstanceOf(Promise);
  });
  
  it('should aggregate multiple pending promises', async () => {
    const cell1 = createCell(10);
    const cell2 = createCell(20);
    const computed = createComputed(({ get }) => get(cell1) + get(cell2));
    
    expect(get(computed)).toBe(30);
    
    const promise1 = Promise.resolve(15);
    const promise2 = Promise.resolve(25);
    
    pending(cell1, promise1);
    pending(cell2, promise2);
    
    // Re-evaluate computed
    expect(computed.isDirty).toBe(true);
    expect(get(computed)).toBe(30);
    
    // Should have aggregated promise
    expect(computed.pendingPromise).toBeDefined();
    expect(computed.pendingPromise).toBeInstanceOf(Promise);
    
    // Verify it resolves when all dependencies resolve
    await Promise.all([promise1, promise2]);
    await computed.pendingPromise;
    // Success - no error thrown
  });
  
  it('should clear pending promise after resolution', async () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    expect(get(computed)).toBe(20);
    
    const promise = Promise.resolve(30);
    pending(cell, promise);
    
    // Re-evaluate to pick up pending
    expect(get(computed)).toBe(20);
    expect(computed.pendingPromise).toBeDefined();
    expect(computed.pendingPromise).toBeInstanceOf(Promise);
    
    await promise;
    await Promise.resolve(); // Wait for finally
    
    // Both cell and computed's pending should be cleared
    expect(cell.pendingPromise).toBeUndefined();
    expect(computed.pendingPromise).toBeUndefined();
    
    // Re-evaluation confirms no pending
    expect(get(computed)).toBe(20);
    expect(computed.pendingPromise).toBeUndefined();
  });
  
  it('should handle pending in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10);
    const computed = createComputed(
      ({ get }) => get(cell) * 2,
      { onNotify }
    );
    
    expect(get(computed)).toBe(20);
    
    const updatePromise = atomicUpdate(async (ops) => {
      ops.pending(computed);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Computed should be marked dirty and notified
    expect(computed.isDirty).toBe(true);
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(computed.pendingPromise).toBeDefined();
    expect(computed.pendingPromise).toBeInstanceOf(Promise);
    
    await updatePromise;
  });
});