import { AtomicContext } from '../atomicContext';
import { State } from '../state';
import { pending } from '../pending';

export function createPending(context: AtomicContext) {
  return <T>(state: State<T>, promise?: Promise<any>): void => {
    const targetPromise = promise || context.atomicUpdatePromise;
    
    if (!targetPromise) {
      throw new Error(
        'pending() requires a Promise argument in synchronous atomicUpdate'
      );
    }
    
    pending(state, targetPromise);
  };
}