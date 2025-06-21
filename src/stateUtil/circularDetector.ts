import { ComputedCopy } from "../atomicContext";
import { Computed } from "../state";

type CircularDetector = {
  setScope: (obj: {}) => void,
  exitScope: (obj: {}) => void,
  add(targetUnit: string ,target: Computed | ComputedCopy): void,
}


function createCircularDetector() : CircularDetector {
  let rootObject: {} | null = null;
  const map = new Map<string, Set<string>>();

  const add = (targetUnit: string ,target: Computed | ComputedCopy) => {
    let targetSet: Set<string> | undefined = undefined;
    if(!map.has(targetUnit)) {
      targetSet = new Set();
      map.set(targetUnit, targetSet);
    } else {
      targetSet = map.get(targetUnit)!;
    }
    
    if(targetSet.has(target.id)) {
      throw new Error(`Circular dependency detected: ${target.id}`);
    }
    targetSet.add(target.id);
  };
  const setScope = (obj: {}) => {
    if(rootObject == null) {
      rootObject = obj;
    }
  };
  const exitScope = (obj: {}) => {
    if(obj === rootObject) {
      map.clear();
      rootObject = null;
    }
  };
  
  return {
    add,
    setScope,
    exitScope
  }
}

const detector = createCircularDetector();
export function globalCircularDetector() {
  return detector;
}