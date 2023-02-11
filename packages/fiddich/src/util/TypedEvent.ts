import { Disposable } from './Disposable';

export interface Listener<T> {
  (event: T): void;
}

export class TypedEvent<T = Record<string, unknown>> {
  syncListeners: Listener<T>[] = [];

  addListener = (listener: Listener<T>): Disposable => {
    this.syncListeners.push(listener);
    return {
      dispose: () => this.removeListener(listener),
    };
  };

  removeListener = (listener: Listener<T>): void => {
    const callbackIndex = this.syncListeners.indexOf(listener);
    if (callbackIndex > -1) this.syncListeners.splice(callbackIndex, 1);
  };

  emit = (event: T): void => {
    [...this.syncListeners].forEach(listener => listener(event));
  };
}
