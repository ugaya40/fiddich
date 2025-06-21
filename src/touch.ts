import { atomicUpdate } from './atomicUpdate';
import type { State } from './state';

export function touch<T>(state: State<T>): void {
  atomicUpdate((ops) => {
    ops.touch(state);
  });
}
