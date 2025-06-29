import type { ComputedCopy } from '../atomicContext';
import type { Computed } from '../state';
import { createScopedCollector, type ScopedCollector } from '../util';

type CircularDetector = {
  setScope: (obj: Record<string, never>) => void;
  exitScope: (obj: Record<string, never>) => void;
  collect(targetUnit: string, target: Computed | ComputedCopy): void;
};

function createCircularDetector(): CircularDetector {
  const collector: ScopedCollector<string, Computed | ComputedCopy, void> = createScopedCollector({
    createStoreForUnit: () => new Set<string>(),
    processItem: (_, store, item) => {
      if (store.has(item.id)) {
        throw new Error(`Circular dependency detected: ${item.id}`);
      }
      store.add(item.id);
    },
    createResult: () => undefined
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
