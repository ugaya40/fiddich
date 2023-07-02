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
} from './atom/atom';
import { EffectsType, FamilyEffectsTypes, FinalizeEffectArgType, InitEffectArgType } from './stateUtil/instanceOperation';

type Cleanup = () => void;
type ChangeValue<T> = (newValue: T) => void;

export type CleanupCell = {
  cleaner: Cleanup | void
}

export type SyncIndependentAtomArg<T> = SyncAtomArg<T> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type AsyncIndependentAtomArg<T> = AsyncAtomArg<T> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type IndependentAtomArg<T> = SyncIndependentAtomArg<T> | AsyncIndependentAtomArg<T>;

export function independentAtom<T>(arg: SyncIndependentAtomArg<T>): SyncAtom<T,CleanupCell>;
export function independentAtom<T>(arg: AsyncIndependentAtomArg<T>): AsyncAtom<T,CleanupCell>;
export function independentAtom<T>(arg: IndependentAtomArg<T>): Atom<T,CleanupCell>;
export function independentAtom<T>(arg: IndependentAtomArg<T>) {
  const { registerTrigger, effects, ...other } = arg;
  const atomState = atom<T, CleanupCell>({
    ...other,
    cell: () => ({cleaner: () =>{}}),
    effects: {
      init: (effectArg: InitEffectArgType<T, {cleaner: Cleanup | void}>) => {
        if (effectArg.cell.cleaner != null) {
          effectArg.cell.cleaner();
        }
        effectArg.cell.cleaner = registerTrigger((newValue: T) => {
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
      finalize: (effectArg: FinalizeEffectArgType<T, {cleaner: Cleanup | void}>) => {
        effects?.finalize?.(effectArg);
        if (effectArg.cell.cleaner != null) {
          effectArg.cell.cleaner();
        }
      },
    },
  });
  return atomState;
}

export type SyncIndependentAtomFamilyArg<T, P> = SyncAtomFamilyArg<T, P, any> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type AsyncIndependentAtomFamilyArg<T, P> = AsyncAtomFamilyArg<T, P, any> & {
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export type IndependentAtomFamilyArg<T, P> = SyncIndependentAtomFamilyArg<T, P> | AsyncIndependentAtomFamilyArg<T, P>;

type FamilyEffectArg<T, P, A extends keyof EffectsType<T>> = Parameters<NonNullable<FamilyEffectsTypes<T, P, any>[A]>>[0];

export function independentAtomFamily<T, P>(arg: SyncIndependentAtomFamilyArg<T, P>): SyncAtomFamilyFunction<T, P, CleanupCell>;
export function independentAtomFamily<T, P>(arg: AsyncIndependentAtomFamilyArg<T, P>): AsyncAtomFamilyFunction<T, P, CleanupCell>;
export function independentAtomFamily<T, P>(arg: IndependentAtomFamilyArg<T, P>): AtomFamilyFunction<T, P, CleanupCell>;
export function independentAtomFamily<T, P>(arg: IndependentAtomFamilyArg<T, P>) {
  const { registerTrigger, effects, ...other } = arg;
  const atomFamilyFunction = atomFamily<T, P, CleanupCell>({
    ...other,
    cell: () => ({cleaner: () =>{}}),
    effects: {
      init: (effectArg: FamilyEffectArg<T, P, 'init'>) => {
        if (effectArg.cell.cleaner != null) {
          effectArg.cell.cleaner();
        }
        effectArg.cell.cleaner = registerTrigger((newValue: T) => {
          if ('default' in arg) {
            effectArg.setSyncAtom(atomFamilyFunction(effectArg.parameter) as SyncAtomFamily<T, P, CleanupCell>, newValue);
          } else if ('asyncDefault' in arg) {
            effectArg.setAsyncAtom(atomFamilyFunction(effectArg.parameter) as AsyncAtomFamily<T, P, CleanupCell>, newValue);
          }
        });
        effects?.init?.(effectArg);
      },
      change: effects?.change,
      error: effects?.error,
      finalize: (effectArg: FamilyEffectArg<T, P, 'finalize'>) => {
        effects?.finalize?.(effectArg);
        if (effectArg.cell.cleaner != null) {
          effectArg.cell.cleaner();
        }
      },
    },
  });
  return atomFamilyFunction;
}
