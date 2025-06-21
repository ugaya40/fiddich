import { atomicUpdate } from './atomicUpdate';
import type { Cell } from './state';

export function set<T>(cell: Cell<T>, value: T): void {
  atomicUpdate((ops) => {
    ops.set(cell, value);
  });
}
