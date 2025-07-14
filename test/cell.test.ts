import { describe, expect, it, vi } from 'vitest';
import { atomicUpdate, cell, computed, get, pending, set, touch } from '../src';

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
  it('should trigger onNotify for cell', () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });

    expect(get(cellA)).toBe(10);
    expect(onNotify).not.toHaveBeenCalled();

    // Touch should trigger notification
    touch(cellA);

    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(get(cellA)).toBe(10); // Value unchanged
  });

  it('should handle touch in atomicUpdate', () => {
    const onNotify = vi.fn();
    const onPendingChange = vi.fn();
    const cellA = cell(10, { onNotify, onPendingChange });

    atomicUpdate((ops) => {
      ops.set(cellA, 20);
      ops.touch(cellA);
    });

    // Should be notified once (deduplication)
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onPendingChange).not.toHaveBeenCalled();
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

  it('should trigger onNotify when disposed', () => {
    const onNotify = vi.fn();
    const cellA = cell(10, { onNotify });

    cellA[Symbol.dispose]();

    expect(onNotify).toHaveBeenCalledTimes(1);
  });

  it('should dispose disposable value', () => {
    const disposeFn = vi.fn();
    const disposableValue = {
      value: 10,
      [Symbol.dispose]: disposeFn,
    };

    const cellA = cell(disposableValue);
    expect(get(cellA)).toBe(disposableValue);

    cellA[Symbol.dispose]();

    expect(disposeFn).toHaveBeenCalledTimes(1);
    expect(() => get(cellA)).toThrow('Cannot access disposed state');
  });

  it('should handle dispose in atomicUpdate', () => {
    const onNotify = vi.fn();
    const disposeFn = vi.fn();
    const disposableValue = {
      value: 10,
      [Symbol.dispose]: disposeFn,
    };

    const cellA = cell(disposableValue, { onNotify });

    atomicUpdate((ops) => {
      ops.dispose(cellA);
    });

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
    pending(cellA, promise, { propagate: true });

    expect(cellA.pendingPromise).toBe(promise);

    await promise;
    // Wait for promise.finally
    await Promise.resolve();

    expect(cellA.pendingPromise).toBeUndefined();
  });

  it('should trigger notification when pending is set', () => {
    const onNotify = vi.fn();
    const onPendingChange = vi.fn();
    const cellA = cell(10, { onNotify, onPendingChange });

    const promise = Promise.resolve(20);
    pending(cellA, promise, { propagate: true });

    expect(onNotify).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenCalledTimes(1);
  });

  it('should propagate pending to dependents when pending is set', () => {
    const onPendingChangeCell = vi.fn();
    const onPendingChangeComputed = vi.fn();
    const cellA = cell(10, { onPendingChange: onPendingChangeCell });
    const computedA = computed(({ get }) => get(cellA) * 2);
    computedA.event.on('onPendingChange',onPendingChangeComputed);

    // Establish dependency
    expect(get(computedA)).toBe(20);
    expect(computedA.isDirty).toBe(false);

    const promise = Promise.resolve(30);
    pending(cellA, promise, { propagate: true });

    // Dependents should NOT be marked dirty but should have pending
    expect(computedA.isDirty).toBe(false);
    expect(computedA.pendingPromise).toBeDefined();
    expect(onPendingChangeCell).toHaveBeenCalledTimes(1);
    expect(onPendingChangeComputed).toHaveBeenCalledTimes(1);
  });

  it('should handle pending in atomicUpdate', async () => {
    const onNotify = vi.fn();
    const onPendingChange = vi.fn();
    const cellA = cell(10, { onNotify, onPendingChange });

    const updatePromise = atomicUpdate(async (ops) => {
      ops.set(cellA, 20);
      ops.pending(cellA, { propagate: true });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Before await - pending should be set, but no commit yet
    expect(cellA.pendingPromise).toBeDefined();
    expect(cellA.pendingPromise).toBeInstanceOf(Promise);
    expect(onNotify).toHaveBeenCalledTimes(0);
    expect(onPendingChange).toHaveBeenCalledTimes(1);

    await updatePromise;
    await Promise.resolve();

    // After await - commit should have happened
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onPendingChange).toHaveBeenCalledTimes(1);
    expect(cellA.pendingPromise).toBeUndefined();
  });

  it('should only clear pending if it matches current promise', async () => {
    const cellA = cell(10);

    const promise1 = new Promise((resolve) => setTimeout(() => resolve(1), 10));
    const promise2 = new Promise((resolve) => setTimeout(() => resolve(2), 20));

    pending(cellA, promise1, { propagate: true });
    expect(cellA.pendingPromise).toBe(promise1);

    pending(cellA, promise2, { propagate: true });
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
