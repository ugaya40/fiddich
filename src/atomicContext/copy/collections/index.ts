import type { AtomicContext } from '../..';
import type { ReactiveCollections } from '../../../collections';
import type { ReactiveCollectionCopy } from './types';
import { createReactiveArrayCopy, isReactiveArray } from './rArray';

export function createCollectionCopy(collection: ReactiveCollections, context: AtomicContext): ReactiveCollectionCopy {
  if (isReactiveArray(collection)) {
    return createReactiveArrayCopy(collection, context);
  } else {
    throw new Error(`Unknown collection type`);
  }
}
