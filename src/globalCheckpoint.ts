let globalCheckpoint = 0;

export function nextCheckpoint(): number {
  return ++globalCheckpoint;
}

export function currentCheckpoint(): number {
  return globalCheckpoint;
}

// For testing purposes
export function resetCheckpoint(): void {
  globalCheckpoint = 0;
}