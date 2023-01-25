export interface Disposable {
  dispose(): void;
}

export class CompositeDisposable implements Disposable {
  private _disposed = false;
  private _disposables: Disposable[] = [];

  add(disposable: Disposable): void {
    if (this._disposed) {
      disposable.dispose();
    } else {
      this._disposables.push(disposable);
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposables.forEach(d => d.dispose());
    this._disposed = true;
  }
}
