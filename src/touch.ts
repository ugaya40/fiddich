import { atomicUpdate } from './atomicUpdate';
import type { ValueStates } from './state';

export function touch<T>(state: ValueStates<T>): void {
  atomicUpdate((ops) => {
    ops.touch(state);
  });
}
