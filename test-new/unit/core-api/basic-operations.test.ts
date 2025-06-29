import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, touch } from '../../../src';
import { createDisposable } from '../../helpers';

describe('basic operations', () => {
  describe('get', () => {
    it('should return current value of Cell', () => {
      const cell = createCell(42);
      expect(get(cell)).toBe(42);
    });

    it('should return computed value of Computed', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      expect(get(computed)).toBe(20);
    });

    it('should work with nested computeds', () => {
      const cell = createCell(5);
      const computed1 = createComputed(({ get }) => get(cell) + 10);
      const computed2 = createComputed(({ get }) => get(computed1) * 2);
      expect(get(computed2)).toBe(30);
    });

    it('should establish dependencies when called from computed', () => {
      const cell = createCell(1);
      const computation = vi.fn(({ get }) => get(cell));
      const computed = createComputed(computation);

      get(computed);
      // First get establishes dependency
      expect(computation).toHaveBeenCalledTimes(1);

      // Changing cell should trigger recomputation
      set(cell, 2);
      expect(computation).toHaveBeenCalledTimes(2);
    });
  });

  describe('set', () => {
    it('should update Cell value', () => {
      const cell = createCell('initial');
      set(cell, 'updated');
      expect(get(cell)).toBe('updated');
    });

    it('should trigger dependent computed recomputation', () => {
      const cell = createCell(1);
      const computation = vi.fn(({ get }) => get(cell) * 10);
      const computed = createComputed(computation);

      get(computed); // Initial computation
      expect(computation).toHaveBeenCalledTimes(1);

      set(cell, 2);
      const result = get(computed);
      expect(result).toBe(20);
      expect(computation).toHaveBeenCalledTimes(2);
    });

    it('should call dispose on old value', () => {
      const { disposable: oldValue, disposed: oldDisposed } = createDisposable('old');
      const { disposable: newValue, disposed: newDisposed } = createDisposable('new');

      const cell = createCell(oldValue);
      set(cell, newValue);

      expect(oldDisposed).toHaveBeenCalledTimes(1);
      expect(newDisposed).not.toHaveBeenCalled();
    });

    it('should not call dispose when value unchanged', () => {
      const { disposable, disposed } = createDisposable();
      const cell = createCell(disposable);

      set(cell, disposable); // Same reference
      expect(disposed).not.toHaveBeenCalled();
    });

    it('should work with Object.is semantics', () => {
      const cell = createCell(NaN);
      set(cell, NaN); // NaN is NaN in Object.is
      expect(get(cell)).toBe(NaN);

      const cell2 = createCell(0);
      set(cell2, -0);
      expect(Object.is(get(cell2), -0)).toBe(true);
    });
  });

  describe('touch', () => {
    it('should trigger recomputation without changing value', () => {
      const cell = createCell(10);
      const computation = vi.fn(({ get }) => get(cell) * 2);
      const computed = createComputed(computation);

      // Initial computation
      expect(get(computed)).toBe(20);
      expect(computation).toHaveBeenCalledTimes(1);

      // Touch should trigger recomputation
      touch(cell);
      expect(get(computed)).toBe(20); // Same value
      expect(computation).toHaveBeenCalledTimes(2);
    });

    it('should work on computed', () => {
      const cell = createCell(5);
      const computed1 = createComputed(({ get }) => get(cell));
      const computation2 = vi.fn(({ get }) => get(computed1) + 10);
      const computed2 = createComputed(computation2);

      // Initial computation
      expect(get(computed2)).toBe(15);
      expect(computation2).toHaveBeenCalledTimes(1);

      // Touch computed1 should trigger computed2 recomputation
      touch(computed1);
      expect(get(computed2)).toBe(15); // Same value
      expect(computation2).toHaveBeenCalledTimes(2);
    });

    it('should propagate through dependency chain', () => {
      const cell = createCell(1);
      const comp1 = vi.fn(({ get }) => get(cell));
      const comp2 = vi.fn(({ get }) => get(computed1));
      const comp3 = vi.fn(({ get }) => get(computed2));

      const computed1 = createComputed(comp1);
      const computed2 = createComputed(comp2);
      const computed3 = createComputed(comp3);

      // Initialize all
      get(computed3);
      expect(comp1).toHaveBeenCalledTimes(1);
      expect(comp2).toHaveBeenCalledTimes(1);
      expect(comp3).toHaveBeenCalledTimes(1);

      // Touch should propagate
      touch(cell);
      expect(comp1).toHaveBeenCalledTimes(2);
      expect(comp2).toHaveBeenCalledTimes(2);
      expect(comp3).toHaveBeenCalledTimes(2);
    });

    it('should trigger onChange callbacks', () => {
      const onChange = vi.fn();
      const cell = createCell(100);
      const computed = createComputed(({ get }) => {
        get(cell); // Establish dependency
        return Math.random(); // Always different value
      }, { onChange });

      const firstValue = get(computed);
      expect(onChange).not.toHaveBeenCalled();

      touch(cell);
      const secondValue = get(computed);
      expect(secondValue).not.toBe(firstValue);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(firstValue, secondValue);
    });

    it('should not trigger onChange if value unchanged', () => {
      const onChange = vi.fn();
      const cell = createCell(42);
      createComputed(({ get }) => get(cell), { onChange });

      expect(onChange).not.toHaveBeenCalled();

      touch(cell);
      expect(onChange).not.toHaveBeenCalled(); // Value still 42
    });
  });

  describe('combined operations', () => {
    it('get-set-get should show updated value', () => {
      const cell = createCell('first');
      expect(get(cell)).toBe('first');
      set(cell, 'second');
      expect(get(cell)).toBe('second');
    });

    it('multiple sets should only keep last value', () => {
      const cell = createCell(0);
      set(cell, 1);
      set(cell, 2);
      set(cell, 3);
      expect(get(cell)).toBe(3);
    });

    it('touch after set should still trigger recomputation', () => {
      const cell = createCell(10);
      const computation = vi.fn(({ get }) => get(cell));
      const computed = createComputed(computation);

      get(computed);
      expect(computation).toHaveBeenCalledTimes(1);

      set(cell, 20);
      expect(computation).toHaveBeenCalledTimes(2);

      touch(cell);
      expect(computation).toHaveBeenCalledTimes(3);
    });
  });
});