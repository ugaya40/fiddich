import { createContext } from 'react';
import { FiddichStore, Store } from '../shareTypes';

export const invalidStatusErrorText = 'This StateInstance status is invalid.';

export const nameAndGlobalNamedStoreMap = new Map<string, FiddichStore>();
export const idAndGlobalNamedStoreMap = new Map<string, FiddichStore>();

export const FiddichStoreContext = createContext<Store | null>(null);
