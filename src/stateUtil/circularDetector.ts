import type { ComputedCopy } from '../atomicContext';
import type { Computed } from '../state';

type CircularDetector = {
  setScope: (obj: Record<string, never>) => void;
  exitScope: (obj: Record<string, never>) => void;
  add(targetUnit: string, target: Computed | ComputedCopy): void;
};

function createCircularDetector(): CircularDetector {
  let rootObject: Record<string, never> | null = null;
  const map = new Map<string, Set<string>>();

  const add = (targetUnit: string, target: Computed | ComputedCopy) => {
    let targetSet: Set<string> | undefined;
    if (!map.has(targetUnit)) {
      targetSet = new Set();
      map.set(targetUnit, targetSet);
    } else {
      targetSet = map.get(targetUnit)!;
    }

    if (targetSet.has(target.id)) {
      throw new Error(`Circular dependency detected: ${target.id}`);
    }
    targetSet.add(target.id);
  };
  const setScope = (obj: Record<string, never>) => {
    if (rootObject == null) {
      rootObject = obj;
    }
  };
  const exitScope = (obj: Record<string, never>) => {
    if (obj === rootObject) {
      map.clear();
      rootObject = null;
    }
  };

  return {
    add,
    setScope,
    exitScope,
  };
}

const detector = createCircularDetector();
export function globalCircularDetector() {
  return detector;
}
