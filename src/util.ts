export type Compare<T> = (prev: T, newValue: T) => boolean;

export const defaultCompare: Compare<any> = (prev: any, newValue: any): boolean =>
  prev === newValue;

export function assertUnreachable(x: never): never {
  throw new Error(`unexpected value reached: ${JSON.stringify(x)}`);
}

export function isDisposable(value: any): value is Disposable {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.dispose in value &&
    typeof value[Symbol.dispose] === 'function'
  );
}

let counter = 0;
export function generateStateId(): string {
  counter++;
  return `${counter}`;
}
