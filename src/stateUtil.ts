import type { AtomicContext, StateCopy } from './atomicContext/types';
import { isComputedCopy } from './stateUtil/typeUtil';

let scheduled = false;
const pendingNotifications = new Set<() => void>();

export function scheduleNotifications(notifications: Array<() => void>): void {
  notifications.forEach((notify) => pendingNotifications.add(notify));

  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const toExecute = [...pendingNotifications];
      pendingNotifications.clear();
      toExecute.forEach((notify) => notify());
    });
  }
}

export function markDirectDependentsAsValueDirty(copy: StateCopy, context: AtomicContext) {
  for (const dependent of copy.dependents) {
    if (isComputedCopy(dependent)) {
      context.valueDirty.add(dependent);
    }
  }
}
