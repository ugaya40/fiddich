export abstract class FiddichError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DisposedStateError extends FiddichError {
  constructor() {
    super('Cannot access disposed state');
  }
}

export class CircularDependencyError extends FiddichError {
  constructor(public readonly stateId: string) {
    super(`Circular dependency detected: ${stateId}`);
  }
}