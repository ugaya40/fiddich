import { atomicUpdate } from './atomicUpdate';
import type { Cell, RefCell } from './state';

export function set<T>(cell: Cell<T> | RefCell<T>, value: T): void {
  atomicUpdate((ops) => {
    ops.set(cell, value);
  });
}
