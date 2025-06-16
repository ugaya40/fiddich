import { State } from './state';
import { atomicUpdate } from './atomicUpdate';

export function touch<T>(state: State<T>): void {
  atomicUpdate((ops) => {
    ops.touch(state);
  });
}