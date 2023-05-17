import { FiddichState, FiddichStateInstance } from '../shareTypes';

export class StateInstanceError extends Error {
  state: FiddichState;

  constructor(public instance: FiddichStateInstance, public originalError: Error) {
    super();
    this.name = 'StateInstanceError';
    this.state = instance.state;
    const storeDisplayName =
      'name' in instance.store && instance.store.name != null
        ? `StoreName: "${instance.store.name}"`
        : 'contextKey' in instance.store && instance.store.contextKey != null
        ? `ContextKey: "${instance.store.contextKey}"`
        : `StoreId: "${instance.store.id}"`;
    this.message = `${storeDisplayName} StateName: "${instance.state.name ?? 'anonymous'}"(${instance.state.key}`;
    this.stack = `${this.stack}
     ------ Original Error ------
     ${this.originalError.message}
     ${this.originalError.stack}`;
  }
}
