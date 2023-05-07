import {
  AsyncAtom,
  AsyncAtomArg,
  AsyncAtomFamily,
  AsyncAtomFamilyArg,
  AsyncAtomFamilyFunction,
  Atom,
  AtomFamilyFunction,
  SyncAtom,
  SyncAtomArg,
  SyncAtomFamily,
  SyncAtomFamilyArg,
  SyncAtomFamilyFunction,
  atom,
  atomFamily,
} from './atom';
import { InitEffectArgType, FinalizeEffectArgType, FamilyEffectsTypes, EffectsType } from './util/stateUtil';

type Cleanup = () => void;
type ChangeValue<T> = (newValue: T) => void;

export type SyncIndependentAtomArg<T> = SyncAtomArg<T> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type AsyncIndependentAtomArg<T> = AsyncAtomArg<T> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type IndependentAtomArg<T> = SyncIndependentAtomArg<T> | AsyncIndependentAtomArg<T>;

export function independentAtom<T>(arg: SyncIndependentAtomArg<T>): SyncAtom<T>;
export function independentAtom<T>(arg: AsyncIndependentAtomArg<T>): AsyncAtom<T>;
export function independentAtom<T>(arg: IndependentAtomArg<T>): Atom<T>;
export function independentAtom<T>(arg: IndependentAtomArg<T>) {
  const { registerTrigger, effects, ...other } = arg;
  let cleaner: Cleanup | void | null = null;
  const atomState = atom({
    ...other,
    effects: {
      init: (effectArg: InitEffectArgType<T>) => {
        if (cleaner != null) {
          cleaner();
        }
        cleaner = registerTrigger((newValue: T) => {
          if ('default' in atomState) {
            effectArg.setSyncAtom(atomState, newValue);
          } else if ('asyncDefault' in atomState) {
            effectArg.setAsyncAtom(atomState, newValue);
          }
        });
        effects?.init?.(effectArg);
      },
      change: effects?.change,
      error: effects?.error,
      finalize: (effectArg: FinalizeEffectArgType<T>) => {
        effects?.finalize?.(effectArg);
        if (cleaner != null) {
          cleaner();
        }
      },
    },
  });
  return atomState;
}

export type SyncIndependentAtomFamilyArg<T, P> = SyncAtomFamilyArg<T, P> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type AsyncIndependentAtomFamilyArg<T, P> = AsyncAtomFamilyArg<T, P> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type IndependentAtomFamilyArg<T, P> = SyncIndependentAtomFamilyArg<T, P> | AsyncIndependentAtomFamilyArg<T, P>;

type FamilyEffectArg<T, P, A extends keyof EffectsType<T>> = Parameters<NonNullable<FamilyEffectsTypes<T, P>[A]>>[0];

export function independentAtomFamily<T, P>(arg: SyncIndependentAtomFamilyArg<T, P>): SyncAtomFamilyFunction<T, P>;
export function independentAtomFamily<T, P>(arg: AsyncIndependentAtomFamilyArg<T, P>): AsyncAtomFamilyFunction<T, P>;
export function independentAtomFamily<T, P>(arg: IndependentAtomFamilyArg<T, P>): AtomFamilyFunction<T, P>;
export function independentAtomFamily<T, P>(arg: IndependentAtomFamilyArg<T, P>) {
  const { registerTrigger, effects, ...other } = arg;
  let cleaner: Cleanup | void | null = null;
  const atomFamilyFunction = atomFamily({
    ...other,
    effects: {
      init: (effectArg: FamilyEffectArg<T, P, 'init'>) => {
        if (cleaner != null) {
          cleaner();
        }
        cleaner = registerTrigger((newValue: T) => {
          if ('default' in arg) {
            effectArg.setSyncAtom(atomFamilyFunction(effectArg.parameter) as SyncAtomFamily<T, P>, newValue);
          } else if ('asyncDefault' in arg) {
            effectArg.setAsyncAtom(atomFamilyFunction(effectArg.parameter) as AsyncAtomFamily<T, P>, newValue);
          }
        });
        effects?.init?.(effectArg);
      },
      change: effects?.change,
      error: effects?.error,
      finalize: (effectArg: FamilyEffectArg<T, P, 'finalize'>) => {
        effects?.finalize?.(effectArg);
        if (cleaner != null) {
          cleaner();
        }
      },
    },
  });
  return atomFamilyFunction;
}
