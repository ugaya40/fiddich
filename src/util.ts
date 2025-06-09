export type Compare<T> = (prev: T, newValue: T) => boolean;

export const defaultCompare: Compare<unknown> = (prev: unknown , newValue: unknown): boolean => prev === newValue;