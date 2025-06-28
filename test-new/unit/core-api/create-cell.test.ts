import { describe, it, expect, vi } from 'vitest';
import { createCell, get, set } from '../../../src';
import { createDisposable } from '../../helpers';

describe('createCell', () => {
  describe('basic functionality', () => {
    it('should create a cell with initial value', () => {
      const cell = createCell(10);
      expect(get(cell)).toBe(10);
    });

    it('should allow updating the value', () => {
      const cell = createCell('initial');
      set(cell, 'updated');
      expect(get(cell)).toBe('updated');
    });

    it('should work with different types', () => {
      const numberCell = createCell(42);
      const stringCell = createCell('hello');
      const booleanCell = createCell(true);
      const objectCell = createCell({ foo: 'bar' });
      const arrayCell = createCell([1, 2, 3]);

      expect(get(numberCell)).toBe(42);
      expect(get(stringCell)).toBe('hello');
      expect(get(booleanCell)).toBe(true);
      expect(get(objectCell)).toEqual({ foo: 'bar' });
      expect(get(arrayCell)).toEqual([1, 2, 3]);
    });
  });

  describe('compare option', () => {
    it('should use default Object.is comparison', () => {
      const onChange = vi.fn();
      const cell = createCell<number>(10, { onChange });

      set(cell, 10); // Same value
      expect(onChange).not.toHaveBeenCalled();

      set(cell, 20); // Different value
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(10, 20);
    });

    it('should use custom compare function', () => {
      const onChange = vi.fn();
      const cell = createCell(
        { value: 10 },
        {
          compare: (a, b) => a.value % 2 === b.value % 2,
          onChange,
        }
      );

      set(cell, { value: 20 }); // Same value according to compare
      expect(onChange).not.toHaveBeenCalled();

      set(cell, { value: 25 }); // Different value
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ value: 10 }, { value: 25 });
    });

    it('should handle NaN values correctly', () => {
      const onChange = vi.fn();
      const cell = createCell(NaN, { onChange });

      set(cell, NaN); // NaN is NaN according to Object.is
      expect(onChange).not.toHaveBeenCalled();

      set(cell, 0);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(NaN, 0);
    });
  });

  describe('onChange callback', () => {
    it('should be called when value changes', () => {
      const onChange = vi.fn();
      const cell = createCell<number>(0, { onChange });

      set(cell, 1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(0, 1);

      set(cell, 2);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledWith(1, 2);
    });

    it('should not be called when value remains the same', () => {
      const onChange = vi.fn();
      const cell = createCell('test', { onChange });

      set(cell, 'test');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('dispose functionality', () => {
    it('should call dispose on old value when setting new value', () => {
      const { disposable: oldValue, disposed: oldDisposed } = createDisposable('old');
      const { disposable: newValue, disposed: newDisposed } = createDisposable('new');

      const cell = createCell(oldValue);
      expect(oldDisposed).not.toHaveBeenCalled();

      set(cell, newValue);
      expect(oldDisposed).toHaveBeenCalledTimes(1);
      expect(newDisposed).not.toHaveBeenCalled();
    });

    it('should not call dispose when setting the same value', () => {
      const { disposable, disposed } = createDisposable();
      const cell = createCell(disposable);

      set(cell, disposable);
      expect(disposed).not.toHaveBeenCalled();
    });

    it('should handle null and undefined values safely', () => {
      const { disposable, disposed } = createDisposable();
      const cell = createCell<any>(null);

      // Setting from null to disposable
      set(cell, disposable);
      expect(disposed).not.toHaveBeenCalled();

      // Setting from disposable to undefined
      set(cell, undefined);
      expect(disposed).toHaveBeenCalledTimes(1);

      // Setting from undefined to null
      set(cell, null);
      // No error should occur
    });
  });

});