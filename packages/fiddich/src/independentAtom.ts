import { SyncAtomValueArg, atom } from './atom';
import { Compare } from './shareTypes';

type Cleanup = () => void;
type ChangeValue<T> = (newValue: T) => void;

export type IndependentAtomArg<T> = {
  name?: string;
  default: SyncAtomValueArg<T>;
  compare?: Compare<T>;
  registerTrigger: (change: ChangeValue<T>) => Cleanup | void;
};

export const independentAtom = <T>(arg: IndependentAtomArg<T>) => {
  const { registerTrigger, ...other } = arg;
  let cleaner: Cleanup | void | null = null;
  const atomState = atom({
    ...other,
    effects: {
      init: ({ setSyncAtom }) => {
        if (cleaner != null) {
          cleaner();
        }
        cleaner = registerTrigger((newValue: T) => setSyncAtom(atomState, newValue));
      },
      finalize: () => {
        if (cleaner != null) {
          cleaner();
        }
      },
    },
  });
  return atomState;
};
