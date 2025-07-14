export type Listener<Payload> = (payload: Payload) => void;

export interface EventEmitter<Events extends Record<PropertyKey, any>> extends Disposable {
  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): Disposable;
  once<K extends keyof Events>(event: K, fn: Listener<Events[K]>): Disposable;
  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void;
  removeAllListeners<K extends keyof Events>(event: K): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  listenerCount<K extends keyof Events>(event: K): number;
}

export function createEventEmitter<Events extends Record<PropertyKey, any>>(): EventEmitter<Events> {
  const listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  function on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): Disposable {
    (listeners[event] ??= new Set()).add(fn);
    return {
      [Symbol.dispose]() {
        off(event, fn);
      }
    };
  }

  function once<K extends keyof Events>(event: K, fn: Listener<Events[K]>): Disposable {
    const wrapper: Listener<Events[K]> = payload => {
      off(event, wrapper);
      fn(payload);
    };
    return on(event, wrapper);
  }

  function off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void {
    listeners[event]?.delete(fn);
    if (listeners[event]?.size === 0) delete listeners[event];
  }

  function removeAllListeners<K extends keyof Events>(event: K): void {
    delete listeners[event];
  }

  function emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    [...(listeners[event] ?? [])].forEach(fn => fn(payload));
  }

  function listenerCount<K extends keyof Events>(event: K): number {
    return listeners[event]?.size ?? 0;
  }

  return {
    on,
    once,
    off,
    removeAllListeners,
    emit,
    listenerCount,
    [Symbol.dispose]() {
      for (const event in listeners) {
        delete listeners[event];
      }
    }
  };
}