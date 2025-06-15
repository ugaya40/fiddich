import { Cell } from './state';
import { atomicUpdate } from './atomicUpdate';

export function set<T>(cell: Cell<T>, value: T): void {
  atomicUpdate((ops) => {
    ops.set(cell, value);
  });
}