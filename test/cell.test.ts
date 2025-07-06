import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate, touch, pending } from '../src';

describe('Cell basic operations', () => {
  it('should create cell with initial value', () => {
    const cell = createCell(10);
    expect(get(cell)).toBe(10);
  });

  it('should update cell value with set', () => {
    const cell = createCell(10);
    set(cell, 20);
    expect(get(cell)).toBe(20);
  });

  it('should handle multiple set operations', () => {
    const cell = createCell(0);
    set(cell, 1);
    set(cell, 2);
    set(cell, 3);
    expect(get(cell)).toBe(3);
  });

  it('should create cell with object value', () => {
    const cell = createCell({ name: 'test', value: 100 });
    expect(get(cell)).toEqual({ name: 'test', value: 100 });
  });

  it('should create cell with array value', () => {
    const cell = createCell([1, 2, 3]);
    expect(get(cell)).toEqual([1, 2, 3]);
  });


  it('should support null and undefined values', () => {
    const nullCell = createCell<null | undefined>(null);
    expect(get(nullCell)).toBe(null);

    const undefinedCell = createCell<undefined>(undefined);
    expect(get(undefinedCell)).toBe(undefined);

    set(nullCell, undefined);
    expect(get(nullCell)).toBe(undefined);
  });

  it('should handle boolean values', () => {
    const cell = createCell(true);
    expect(get(cell)).toBe(true);
    set(cell, false);
    expect(get(cell)).toBe(false);
  });

  it('should handle string values', () => {
    const cell = createCell('hello');
    expect(get(cell)).toBe('hello');
    set(cell, 'world');
    expect(get(cell)).toBe('world');
  });
});

describe('Cell touch', () => {
  it('should trigger onNotify for cell', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10, { onNotify });
    
    expect(get(cell)).toBe(10);
    expect(onNotify).not.toHaveBeenCalled();
    
    // Touch should trigger notification
    touch(cell);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(cell)).toBe(10); // Value unchanged
  });
  
  it('should handle touch in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10, { onNotify });
    
    atomicUpdate((ops) => {
      ops.set(cell, 20);
      ops.touch(cell);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Should be notified once (deduplication)
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(cell)).toBe(20);
  });
});

describe('Cell dispose', () => {
  it('should mark cell as disposed', () => {
    const cell = createCell(10);
    
    expect(get(cell)).toBe(10);
    
    cell[Symbol.dispose]();
    
    expect(() => get(cell)).toThrow('Cannot access disposed state');
    expect(() => set(cell, 20)).toThrow('Cannot access disposed state');
  });
  
  it('should trigger onNotify when disposed', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10, { onNotify });
    
    cell[Symbol.dispose]();
    
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
    
    const cell = createCell(disposableValue);
    expect(get(cell)).toBe(disposableValue);
    
    cell[Symbol.dispose]();
    
    expect(disposeFn).toHaveBeenCalledTimes(1);
    expect(() => get(cell)).toThrow('Cannot access disposed state');
  });
  
  it('should handle dispose in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const disposeFn = vi.fn();
    const disposableValue = {
      value: 10,
      [Symbol.dispose]: disposeFn
    };
    
    const cell = createCell(disposableValue, { onNotify });
    
    atomicUpdate((ops) => {
      ops.dispose(cell);
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Cell should be disposed
    expect(() => get(cell)).toThrow('Cannot access disposed state');
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });
  
  it('should dispose old value when setting new value', () => {
    const disposeFn1 = vi.fn();
    const disposeFn2 = vi.fn();
    
    const value1 = { value: 1, [Symbol.dispose]: disposeFn1 };
    const value2 = { value: 2, [Symbol.dispose]: disposeFn2 };
    
    const cell = createCell(value1);
    
    // Set new value should dispose old value
    set(cell, value2);
    expect(disposeFn1).toHaveBeenCalledTimes(1);
    expect(disposeFn2).not.toHaveBeenCalled();
    
    // Dispose cell should dispose current value
    cell[Symbol.dispose]();
    expect(disposeFn2).toHaveBeenCalledTimes(1);
  });
});

describe('Cell pending', () => {
  it('should set and clear pending promise', async () => {
    const cell = createCell(10);
    
    expect(cell.pendingPromise).toBeUndefined();
    
    const promise = Promise.resolve(20);
    pending(cell, promise);
    
    expect(cell.pendingPromise).toBe(promise);
    
    await promise;
    // Wait for promise.finally
    await Promise.resolve();
    
    expect(cell.pendingPromise).toBeUndefined();
  });
  
  it('should trigger notification when pending is set', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10, { onNotify });
    
    const promise = Promise.resolve(20);
    pending(cell, promise);
    
    // Wait for microtask
    await Promise.resolve();
    
    expect(onNotify).toHaveBeenCalledTimes(1);
  });
  
  it('should mark dependents as dirty when pending is set', () => {
    const cell = createCell(10);
    const computed = createComputed(({ get }) => get(cell) * 2);
    
    // Establish dependency
    expect(get(computed)).toBe(20);
    expect(computed.isDirty).toBe(false);
    
    const promise = Promise.resolve(30);
    pending(cell, promise);
    
    // Dependents should be marked dirty
    expect(computed.isDirty).toBe(true);
  });
  
  it('should handle pending in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const cell = createCell(10, { onNotify });
    
    const updatePromise = atomicUpdate(async (ops) => {
      ops.set(cell, 20);
      ops.pending(cell);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Wait for microtask
    await Promise.resolve();
    
    // Cell should have a pending promise (not checking identity)
    expect(cell.pendingPromise).toBeDefined();
    expect(cell.pendingPromise).toBeInstanceOf(Promise);
    expect(onNotify).toHaveBeenCalledTimes(1);
    
    await updatePromise;
    await Promise.resolve();
    
    expect(cell.pendingPromise).toBeUndefined();
  });
  
  it('should only clear pending if it matches current promise', async () => {
    const cell = createCell(10);
    
    const promise1 = new Promise(resolve => setTimeout(() => resolve(1), 10));
    const promise2 = new Promise(resolve => setTimeout(() => resolve(2), 20));
    
    pending(cell, promise1);
    expect(cell.pendingPromise).toBe(promise1);
    
    pending(cell, promise2);
    expect(cell.pendingPromise).toBe(promise2);
    
    // Wait for promise1 to complete
    await promise1;
    await Promise.resolve();
    
    // Should still have promise2 because it was overwritten
    expect(cell.pendingPromise).toBe(promise2);
    
    // Wait for promise2 to complete
    await promise2;
    await Promise.resolve();
    
    // Now should be cleared
    expect(cell.pendingPromise).toBeUndefined();
  });
});