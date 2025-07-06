import { describe, it, expect, vi } from 'vitest';
import { Computed, cell, computed, get, set, atomicUpdate, touch, pending } from '../src';
import { CircularDependencyError } from '../src/errors';

describe('Computed basic operations', () => {
  it('should create computed with simple calculation', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    expect(get(computedA)).toBe(20);
  });

  it('should update when dependency changes', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    
    expect(get(computedA)).toBe(20);
    set(cellA, 20);
    expect(get(computedA)).toBe(40);
  });

  it('should handle multiple dependencies', () => {
    const cellA = cell(10);
    const cellB = cell(20);
    const computedA = computed(({ get }) => get(cellA) + get(cellB));
    
    expect(get(computedA)).toBe(30);
    set(cellA, 15);
    expect(get(computedA)).toBe(35);
    set(cellB, 25);
    expect(get(computedA)).toBe(40);
  });

  it('should handle chained computeds', () => {
    const cellA = cell(10);
    const computed1 = computed(({ get }) => get(cellA) * 2);
    const computed2 = computed(({ get }) => get(computed1) + 5);
    
    expect(get(computed2)).toBe(25);
    set(cellA, 20);
    expect(get(computed2)).toBe(45);
  });

  it('should handle diamond dependency', () => {
    const cellA = cell(10);
    const computed1 = computed(({ get }) => get(cellA) * 2);
    const computed2 = computed(({ get }) => get(cellA) * 3);
    const computed3 = computed(({ get }) => get(computed1) + get(computed2));
    
    expect(get(computed3)).toBe(50); // 20 + 30
    set(cellA, 20);
    expect(get(computed3)).toBe(100); // 40 + 60
  });

  it('should only recompute when necessary (pull-based)', () => {
    const cellA = cell(10);
    const computeFn = vi.fn(({ get }) => get(cellA) * 2);
    const computedA = computed(computeFn);
    
    // Initial computation
    expect(get(computedA)).toBe(20);
    expect(computeFn).toHaveBeenCalledTimes(1);
    
    // Same get should not recompute
    expect(get(computedA)).toBe(20);
    expect(computeFn).toHaveBeenCalledTimes(1);
    
    // After set, should recompute on next get
    set(cellA, 15);
    expect(get(computedA)).toBe(30);
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  it('should handle conditional dependencies', () => {
    const condition = cell(true);
    const cellA = cell(10);
    const cellB = cell(20);
    
    const computedA = computed(({ get }) => {
      if (get(condition)) {
        return get(cellA);
      } else {
        return get(cellB);
      }
    });
    
    expect(get(computedA)).toBe(10);
    
    set(condition, false);
    expect(get(computedA)).toBe(20);
    
    // Changing cellA should not affect computed when condition is false
    set(cellA, 100);
    expect(get(computedA)).toBe(20);
  });

  it('should handle computed returning objects', () => {
    const name = cell('John');
    const age = cell(25);
    const computedA = computed(({ get }) => ({
      name: get(name),
      age: get(age)
    }));
    
    expect(get(computedA)).toEqual({ name: 'John', age: 25 });
    set(name, 'Jane');
    expect(get(computedA)).toEqual({ name: 'Jane', age: 25 });
  });

  it('should handle computed returning arrays', () => {
    const cell1 = cell(1);
    const cell2 = cell(2);
    const cell3 = cell(3);
    const computedA = computed(({ get }) => [get(cell1), get(cell2), get(cell3)]);
    
    expect(get(computedA)).toEqual([1, 2, 3]);
    set(cell2, 20);
    expect(get(computedA)).toEqual([1, 20, 3]);
  });

  it('should detect circular dependency', () => {
    let computed1: Computed<number>;
    computed1 = computed<number>(({ get }) => {
      return get(computed2) + 1; // Forward reference
    });
    const computed2 = computed<number>(({ get }) => {
      return get(computed1) + 1;
    });
    
    expect(() => get(computed1)).toThrow(CircularDependencyError);
  });

  it('should handle null and undefined returns', () => {
    const cellA = cell(true);
    const computedA = computed(({ get }) => {
      return get(cellA) ? null : undefined;
    });
    
    expect(get(computedA)).toBe(null);
    set(cellA, false);
    expect(get(computedA)).toBe(undefined);
  });

  it('should handle complex dependency chains', () => {
    const base = cell(1);
    const level1a = computed(({ get }) => get(base) * 2);
    const level1b = computed(({ get }) => get(base) * 3);
    const level2a = computed(({ get }) => get(level1a) + get(level1b));
    const level2b = computed(({ get }) => get(level1a) * get(level1b));
    const level3 = computed(({ get }) => get(level2a) + get(level2b));
    
    expect(get(level3)).toBe(11); // (2 + 3) + (2 * 3) = 5 + 6 = 11
    set(base, 2);
    expect(get(level3)).toBe(34); // (4 + 6) + (4 * 6) = 10 + 24 = 34
  });
});

describe('Computed touch', () => {
  it('should trigger onNotify for computed', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10);
    const computedA = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify }
    );
    
    // Initial get
    expect(get(computedA)).toBe(20);
    expect(onNotify).not.toHaveBeenCalled();
    
    // Touch should trigger notification
    touch(computedA);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
    
    // Value should remain the same
    expect(get(computedA)).toBe(20);
  });
  
  it('should propagate touch to dependents', async () => {
    const onNotifyParent = vi.fn();
    const onNotifyChild = vi.fn();
    
    const cellA = cell(10);
    const parent = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify: onNotifyParent }
    );
    const child = computed(
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
    const cellA = cell(10);
    const computedA = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify }
    );
    
    expect(get(computedA)).toBe(20);
    
    atomicUpdate((ops) => {
      ops.set(cellA, 20);
      ops.touch(computedA);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Should be notified once (from set, not from touch due to deduplication)
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(computedA)).toBe(40);
  });
});

describe('Computed dispose', () => {
  it('should mark computed as disposed', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    
    expect(get(computedA)).toBe(20);
    
    computedA[Symbol.dispose]();
    
    expect(() => get(computedA)).toThrow('Cannot access disposed state');
  });
  
  it('should trigger onNotify when disposed', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10);
    const computedA = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify }
    );
    
    expect(get(computedA)).toBe(20);
    
    computedA[Symbol.dispose]();
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
  });
  
  it('should remove computed from dependencies when disposed', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    const dependent = computed(({ get }) => get(computedA) + 5);
    
    // Establish dependencies
    expect(get(dependent)).toBe(25);
    expect(cellA.dependents.has(computedA)).toBe(true);
    expect(computedA.dependents.has(dependent)).toBe(true);
    
    // Dispose computed
    computedA[Symbol.dispose]();
    
    // Computed should be removed from cell's dependents
    expect(cellA.dependents.has(computedA)).toBe(false);
    // But dependent relationship remains until dependent is re-evaluated
    expect(computedA.dependents.has(dependent)).toBe(true);
  });
  
  it('should handle dispose in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10);
    const computedA = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify }
    );
    const dependent = computed(({ get }) => get(computedA) + 5);
    
    expect(get(dependent)).toBe(25);
    
    atomicUpdate((ops) => {
      ops.dispose(computedA);
      ops.set(cellA, 20);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Computed should be disposed
    expect(() => get(computedA)).toThrow('Cannot access disposed state');
    // Should have been notified
    expect(onNotify).toHaveBeenCalledTimes(1);
    // Dependent should error when trying to access disposed computed
    expect(() => get(dependent)).toThrow('Cannot access disposed state');
  });
});

describe('Computed pending', () => {
  it('should mark computed as dirty when pending is set', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    
    // Initial evaluation
    expect(get(computedA)).toBe(20);
    expect(computedA.isDirty).toBe(false);
    
    const promise = Promise.resolve(30);
    pending(computedA, promise);
    
    // Computed should be marked dirty
    expect(computedA.isDirty).toBe(true);
    expect(computedA.pendingPromise).toBe(promise);
  });
  
  it('should propagate pending from dependencies', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    const dependent = computed(({ get }) => get(computedA) + 5);
    
    // Establish dependencies
    expect(get(dependent)).toBe(25);
    
    const promise = Promise.resolve(30);
    pending(cellA, promise);
    
    // Computed should be dirty
    expect(computedA.isDirty).toBe(true);
    
    // When computed is re-evaluated, it should pick up cell's pending
    expect(get(computedA)).toBe(20);
    expect(computedA.pendingPromise).toBeDefined();
    expect(computedA.pendingPromise).toBeInstanceOf(Promise);
    
    // Dependent should also pick up the pending when evaluated
    expect(get(dependent)).toBe(25);
    expect(dependent.pendingPromise).toBeDefined();
    expect(dependent.pendingPromise).toBeInstanceOf(Promise);
  });
  
  it('should aggregate multiple pending promises', async () => {
    const cell1 = cell(10);
    const cell2 = cell(20);
    const computedA = computed(({ get }) => get(cell1) + get(cell2));
    
    expect(get(computedA)).toBe(30);
    
    const promise1 = Promise.resolve(15);
    const promise2 = Promise.resolve(25);
    
    pending(cell1, promise1);
    pending(cell2, promise2);
    
    // Re-evaluate computed
    expect(computedA.isDirty).toBe(true);
    expect(get(computedA)).toBe(30);
    
    // Should have aggregated promise
    expect(computedA.pendingPromise).toBeDefined();
    expect(computedA.pendingPromise).toBeInstanceOf(Promise);
    
    // Verify it resolves when all dependencies resolve
    await Promise.all([promise1, promise2]);
    await computedA.pendingPromise;
    // Success - no error thrown
  });
  
  it('should clear pending promise after resolution', async () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    
    expect(get(computedA)).toBe(20);
    
    const promise = Promise.resolve(30);
    pending(cellA, promise);
    
    // Re-evaluate to pick up pending
    expect(get(computedA)).toBe(20);
    expect(computedA.pendingPromise).toBeDefined();
    expect(computedA.pendingPromise).toBeInstanceOf(Promise);
    
    await promise;
    await Promise.resolve(); // Wait for finally
    
    // Both cell and computed's pending should be cleared
    expect(cellA.pendingPromise).toBeUndefined();
    expect(computedA.pendingPromise).toBeUndefined();
    
    // Re-evaluation confirms no pending
    expect(get(computedA)).toBe(20);
    expect(computedA.pendingPromise).toBeUndefined();
  });
  
  it('should handle pending in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10);
    const computedA = computed(
      ({ get }) => get(cellA) * 2,
      { onNotify }
    );
    
    expect(get(computedA)).toBe(20);
    
    const updatePromise = atomicUpdate(async (ops) => {
      ops.pending(computedA);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Computed should be marked dirty and notified
    expect(computedA.isDirty).toBe(true);
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(computedA.pendingPromise).toBeDefined();
    expect(computedA.pendingPromise).toBeInstanceOf(Promise);
    
    await updatePromise;
  });
});