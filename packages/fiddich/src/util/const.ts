import { createContext } from 'react';
import { Compare, FiddichStore, Store } from '../shareTypes';

export const invalidStatusErrorText = 'This StateInstance status is invalid.';
export const noStoreErrorText = 'Component is not inside the FiddichRoot/SubFiddichRoot.';
export const notFoundNamedStoreErrorText = (name: string) => `There is no store named "${name}"`;

export const defaultCompareFunction: Compare<unknown> = (oldValue: unknown | undefined, newValue: unknown) => oldValue === newValue;

export const FiddichStoreContext = createContext<Store | null>(null);
