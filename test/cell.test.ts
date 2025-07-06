import { describe, it, expect, vi } from 'vitest';
import { cell, computed, get, set, atomicUpdate, touch, pending } from '../src';

describe('Cell basic operations', () => {
  it('should create cell with initial value', () => {
    const cellA = cell(10);
    expect(get(cellA)).toBe(10);
  });

  it('should update cell value with set', () => {
    const cellA = cell(10);
    set(cellA, 20);
    expect(get(cellA)).toBe(20);
  });

  it('should handle multiple set operations', () => {
    const cellA = cell(0);
    set(cellA, 1);
    set(cellA, 2);
    set(cellA, 3);
    expect(get(cellA)).toBe(3);
  });

  it('should create cell with object value', () => {
    const cellA = cell({ name: 'test', value: 100 });
    expect(get(cellA)).toEqual({ name: 'test', value: 100 });
  });

  it('should create cell with array value', () => {
    const cellA = cell([1, 2, 3]);
    expect(get(cellA)).toEqual([1, 2, 3]);
  });


  it('should support null and undefined values', () => {
    const nullCell = cell<null | undefined>(null);
    expect(get(nullCell)).toBe(null);

    const undefinedCell = cell<undefined>(undefined);
    expect(get(undefinedCell)).toBe(undefined);

    set(nullCell, undefined);
    expect(get(nullCell)).toBe(undefined);
  });

  it('should handle boolean values', () => {
    const cellA = cell(true);
    expect(get(cellA)).toBe(true);
    set(cellA, false);
    expect(get(cellA)).toBe(false);
  });

  it('should handle string values', () => {
    const cellA = cell('hello');
    expect(get(cellA)).toBe('hello');
    set(cellA, 'world');
    expect(get(cellA)).toBe('world');
  });
});

describe('Cell touch', () => {
  it('should trigger onNotify for cell', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });
    
    expect(get(cellA)).toBe(10);
    expect(onNotify).not.toHaveBeenCalled();
    
    // Touch should trigger notification
    touch(cellA);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(cellA)).toBe(10); // Value unchanged
  });
  
  it('should handle touch in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });
    
    atomicUpdate((ops) => {
      ops.set(cellA, 20);
      ops.touch(cellA);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Should be notified once (deduplication)
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(cellA)).toBe(20);
  });
});

describe('Cell dispose', () => {
  it('should mark cell as disposed', () => {
    const cellA = cell(10);
    
    expect(get(cellA)).toBe(10);
    
    cellA[Symbol.dispose]();
    
    expect(() => get(cellA)).toThrow('Cannot access disposed state');
    expect(() => set(cellA, 20)).toThrow('Cannot access disposed state');
  });
  
  it('should trigger onNotify when disposed', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });
    
    cellA[Symbol.dispose]();
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
  });
  
  it('should dispose disposable value', () => {
    const disposeFn = vi.fn();
    const disposableValue = {
      value: 10,
      [Symbol.dispose]: disposeFn
    };
    
    const cellA = cell(disposableValue);
    expect(get(cellA)).toBe(disposableValue);
    
    cellA[Symbol.dispose]();
    
    expect(disposeFn).toHaveBeenCalledTimes(1);
    expect(() => get(cellA)).toThrow('Cannot access disposed state');
  });
  
  it('should handle dispose in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const disposeFn = vi.fn();
    const disposableValue = {
      value: 10,
      [Symbol.dispose]: disposeFn
    };
    
    const cellA = cell(disposableValue, { onNotify });
    
    atomicUpdate((ops) => {
      ops.dispose(cellA);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Cell should be disposed
    expect(() => get(cellA)).toThrow('Cannot access disposed state');
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });
  
  it('should dispose old value when setting new value', () => {
    const disposeFn1 = vi.fn();
    const disposeFn2 = vi.fn();
    
    const value1 = { value: 1, [Symbol.dispose]: disposeFn1 };
    const value2 = { value: 2, [Symbol.dispose]: disposeFn2 };
    
    const cellA = cell(value1);
    
    // Set new value should dispose old value
    set(cellA, value2);
    expect(disposeFn1).toHaveBeenCalledTimes(1);
    expect(disposeFn2).not.toHaveBeenCalled();
    
    // Dispose cell should dispose current value
    cellA[Symbol.dispose]();
    expect(disposeFn2).toHaveBeenCalledTimes(1);
  });
});

describe('Cell pending', () => {
  it('should set and clear pending promise', async () => {
    const cellA = cell(10);
    
    expect(cellA.pendingPromise).toBeUndefined();
    
    const promise = Promise.resolve(20);
    pending(cellA, promise);
    
    expect(cellA.pendingPromise).toBe(promise);
    
    await promise;
    // Wait for promise.finally
    await Promise.resolve();
    
    expect(cellA.pendingPromise).toBeUndefined();
  });
  
  it('should trigger notification when pending is set', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });
    
    const promise = Promise.resolve(20);
    pending(cellA, promise);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
  });
  
  it('should mark dependents as dirty when pending is set', () => {
    const cellA = cell(10);
    const computedA = computed(({ get }) => get(cellA) * 2);
    
    // Establish dependency
    expect(get(computedA)).toBe(20);
    expect(computedA.isDirty).toBe(false);
    
    const promise = Promise.resolve(30);
    pending(cellA, promise);
    
    // Dependents should be marked dirty
    expect(computedA.isDirty).toBe(true);
  });
  
  it('should handle pending in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });
    
    const updatePromise = atomicUpdate(async (ops) => {
      ops.set(cellA, 20);
      ops.pending(cellA);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Cell should have a pending promise (not checking identity)
    expect(cellA.pendingPromise).toBeDefined();
    expect(cellA.pendingPromise).toBeInstanceOf(Promise);
    expect(onNotify).toHaveBeenCalledTimes(1);
    
    await updatePromise;
    await Promise.resolve();
    
    expect(cellA.pendingPromise).toBeUndefined();
  });
  
  it('should only clear pending if it matches current promise', async () => {
    const cellA = cell(10);
    
    const promise1 = new Promise(resolve => setTimeout(() => resolve(1), 10));
    const promise2 = new Promise(resolve => setTimeout(() => resolve(2), 20));
    
    pending(cellA, promise1);
    expect(cellA.pendingPromise).toBe(promise1);
    
    pending(cellA, promise2);
    expect(cellA.pendingPromise).toBe(promise2);
    
    // Wait for promise1 to complete
    await promise1;
    await Promise.resolve();
    
    // Should still have promise2 because it was overwritten
    expect(cellA.pendingPromise).toBe(promise2);
    
    // Wait for promise2 to complete
    await promise2;
    await Promise.resolve();
    
    // Now should be cleared
    expect(cellA.pendingPromise).toBeUndefined();
  });
});