export type Disposable = {
  dispose(): void;
};

export type Listener<T> = {
  (event: T): void;
};

export type EventPublisher<T> = {
  addListener: (listener: Listener<T>) => Disposable;
  removeListener: (listener: Listener<T>) => void;
  emit: (event: T) => void;
};

export const eventPublisher = <T>(): EventPublisher<T> => {
  const syncListeners: Listener<T>[] = [];
  const removeListener = (listener: Listener<T>): void => {
    const callbackIndex = syncListeners.indexOf(listener);
    if (callbackIndex > -1) syncListeners.splice(callbackIndex, 1);
  };

  return {
    addListener: (listener: Listener<T>): Disposable => {
      syncListeners.push(listener);
      return {
        dispose: () => removeListener(listener),
      };
    },
    removeListener,
    emit: (event: T): void => {
      if (syncListeners.length === 0) return;
      [...syncListeners].forEach(listener => listener(event));
    },
  };
};
