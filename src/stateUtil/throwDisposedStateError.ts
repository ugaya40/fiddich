export function throwDisposedStateError() {
  throw new Error('Cannot access disposed state');
}
