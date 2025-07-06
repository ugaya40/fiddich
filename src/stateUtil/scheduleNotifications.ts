import { State } from "../state";

let scheduled = false;
const pendingNotifications = new Set<State>();

export function scheduleNotifications(notificationStates: State[]): void {
  notificationStates.forEach(state => {
    if(state.onNotify != null) {
      pendingNotifications.add(state);
    }
  });

  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => {
      const toExecute = [...pendingNotifications];
      pendingNotifications.clear();
      toExecute.forEach(state => state.onNotify?.());
      scheduled = false;
    });
  }
}