import type { ValueStateCopy } from '../atomicContext';
import { CircularDependencyError } from '../errors';
import type { ValueStates } from '../types';
import { createScopedCollector, type ScopedCollector } from '../util/scopedCollector';

type CircularDetector = {
  setScope: (obj: Record<string, never>) => void;
  exitScope: (obj: Record<string, never>) => void;
  collect(targetUnit: string, target: ValueStates | ValueStateCopy): void;
};

function createCircularDetector(): CircularDetector {
  const collector: ScopedCollector<string, ValueStates | ValueStateCopy, Set<string>> = createScopedCollector({
    createStoreForUnit: () => new Set<string>(),
    processItem: (_, store, item) => {
      if (store.has(item.id)) {
        throw new CircularDependencyError(item.id);
      }
      store.add(item.id);
    },
  });

  return {
    collect: collector.collect,
    setScope: collector.setScope,
    exitScope: collector.exitScope,
  };
}

const detector = createCircularDetector();
export function globalCircularDetector() {
  return detector;
}
