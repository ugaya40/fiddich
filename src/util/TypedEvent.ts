import { anonymousPromise } from './util';
import { Disposable } from './Disposable';

export interface Listener<T> {
  (event: T): void;
}

export interface AsyncListener<T> {
  (event: T): Promise<void>;
}

export class TypedEvent<T = Record<string, unknown>> {
  syncListeners: Listener<T>[] = [];
  asyncListeners: AsyncListener<T>[] = [];

  addListener = (listener: Listener<T>): Disposable => {
    this.syncListeners.push(listener);
    return {
      dispose: () => this.removeListener(listener),
    };
  };

  addAsyncListener = (listener: AsyncListener<T>): Disposable => {
    this.asyncListeners.push(listener);
    return {
      dispose: () => this.removeAsyncListener(listener),
    };
  };

  removeListener = (listener: Listener<T>): void => {
    const callbackIndex = this.syncListeners.indexOf(listener);
    if (callbackIndex > -1) this.syncListeners.splice(callbackIndex, 1);
  };

  removeAsyncListener = (listener: AsyncListener<T>): void => {
    const callbackIndex = this.asyncListeners.indexOf(listener);
    if (callbackIndex > -1) this.asyncListeners.splice(callbackIndex, 1);
  };

  emitAsync = async (event: T): Promise<void> => {
    const syncListeners = [...this.syncListeners].map(listener => anonymousPromise(() => listener(event)));
    const asyncListeners = [...this.asyncListeners].map(listener => listener(event));
    await Promise.all([...syncListeners, ...asyncListeners]);
  };
}
