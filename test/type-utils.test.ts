import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  type Cell,
  type CellValue,
  type ComputedValue,
  createCell,
  createComputed,
  get,
  isCell,
  isComputed,
  isState,
  type State,
  type StateValue,
  set,
} from '../src';

describe('Type utilities', () => {
  describe('Type extraction utilities', () => {
    it('should extract value types correctly', () => {
      const numberCell = createCell(42);
      const stringComputed = createComputed(() => 'hello');

      // Type assertions
      expectTypeOf<StateValue<typeof numberCell>>().toEqualTypeOf<number>();
      expectTypeOf<CellValue<typeof numberCell>>().toEqualTypeOf<number>();
      expectTypeOf<StateValue<typeof stringComputed>>().toEqualTypeOf<string>();
      expectTypeOf<ComputedValue<typeof stringComputed>>().toEqualTypeOf<string>();
    });
  });

  describe('Type guards', () => {
    it('should correctly identify Cell', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(isCell(cell)).toBe(true);
      expect(isCell(computed)).toBe(false);
      expect(isCell({})).toBe(false);
      expect(isCell(null)).toBe(false);
    });

    it('should correctly identify Computed', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(isComputed(computed)).toBe(true);
      expect(isComputed(cell)).toBe(false);
      expect(isComputed({})).toBe(false);
      expect(isComputed(null)).toBe(false);
    });

    it('should correctly identify State', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);

      expect(isState(cell)).toBe(true);
      expect(isState(computed)).toBe(true);
      expect(isState({})).toBe(false);
      expect(isState(null)).toBe(false);
    });

    it('should narrow types with guards', () => {
      const states: State[] = [createCell(10), createComputed(() => 'hello')];

      states.forEach((state) => {
        if (isCell(state)) {
          // TypeScript knows this is a Cell
          expect(state.kind).toBe('cell');
        } else if (isComputed(state)) {
          // TypeScript knows this is a Computed
          expect(state.kind).toBe('computed');
          expect(state.dependencies).toBeDefined();
        }
      });
    });
  });

  describe('Complex type patterns', () => {
    it('should handle nested state structures', () => {
      interface User {
        id: number;
        name: string;
      }

      const userCell = createCell<User | null>(null);
      const userNameComputed = createComputed(({ get }) => {
        const user = get(userCell);
        return user?.name ?? 'Anonymous';
      });

      expect(get(userNameComputed)).toBe('Anonymous');

      // Update user
      const newUser: User = { id: 1, name: 'John' };
      set(userCell, newUser);
      expect(get(userNameComputed)).toBe('John');
    });

    it('should work with array of states', () => {
      const cells: Cell<number>[] = [createCell(1), createCell(2), createCell(3)];

      const sum = createComputed(({ get }) => cells.reduce((acc, cell) => acc + get(cell), 0));

      expect(get(sum)).toBe(6);

      // Update one cell
      set(cells[1], 5);
      expect(get(sum)).toBe(9);
    });
  });
});
