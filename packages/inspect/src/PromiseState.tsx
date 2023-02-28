import { atom, selector, useSetAtom, wrapFiddichRoot } from "fiddich";
import { FC } from "react";
import { managedPromise, sleep, StateString, SuspenseWrapper } from "./share";

let resolveRef: () => void | undefined; 

const AtomState1 = atom({
  key: 'AtomState1',
  default: () => {
    const [promise, resolve] = managedPromise('atom1 resolved');
    resolveRef = resolve;
    return promise;
  }
});

const SelectorState1 = selector({
  key: 'SelectorState1',
  getAsync: async ({get}) => {
    const atomState1 = await get(AtomState1);
    await sleep(3000);
    return `selector-${atomState1}`;
  }
});

const PromiseStateInternal: FC = (props) => {
  const setAtomState1 = useSetAtom(AtomState1);
  return (
    <>
      <p/>
        <button onClick={() => resolveRef!()}>resolve AtomState1 defaultValue</button>
        <span>AtomState1 changes after 0s, SeletorState1 changes after 3s </span>
      <p/>

      <p>
        <button onClick={() => setAtomState1('value')}>
          {`set 'value' to AtomsState1`}
        </button>
        <span>AtomState1 changes after 0s, SeletorState1 changes after 3s </span>
      </p>

      <p>
        <button onClick={() => setAtomState1(new Promise(async r => {
          await sleep(3000);
          r('promiseValue')
        }))}>
          {`set 'Promise<promiseValue>' to AtomsState1`}
        </button>
        <span>AtomState1 changes after 3s, SeletorState1 changes after 6s </span>
      </p>

      <p>
        <button onClick={() => setAtomState1((old) => old + '-functionValue')}>
          {`set '(old) => old + functionValue' to AtomsState1`}
        </button>
        <span>AtomState1 changes after 0s, SeletorState1 changes after 3s </span>
      </p>

      <p>
        <button onClick={() => setAtomState1(async (old) => {
          await sleep(3000);
          return old +'-promiseFunctionValue';
        })}>
          {`set '(old) => Promise<old + promiseFunctionValue>' to AtomsState1`}
        </button>
        <span>AtomState1 changes after 3s, SeletorState1 changes after 6s </span>
      </p>
      
      <SuspenseWrapper>
        <StateString state={AtomState1}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={SelectorState1}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={AtomState1} option={{noSuspense: true}}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={SelectorState1} option={{noSuspense: true}}/>
      </SuspenseWrapper>
    </>
  );
}

export const PromiseState = wrapFiddichRoot(PromiseStateInternal);