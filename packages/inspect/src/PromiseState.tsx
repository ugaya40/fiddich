import { atom, selector, useSetFiddichAtom, wrapFiddichRoot } from "fiddich";
import { FC, Suspense } from "react";
import { managedPromise, sleep, StateString } from "./share";

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
  get: async ({get}) => {
    const atomState1 = await get(AtomState1);
    await sleep(3000);
    return `selector-${atomState1}`;
  }
});

const PromiseStateInternal: FC = (props) => {
  const setAtomState1 = useSetFiddichAtom(AtomState1);
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
      
      <Suspense fallback={<p>{'loading...AtomState1'}</p>}>
        <StateString state={AtomState1}/>
      </Suspense>
      <Suspense fallback={<p>{'loading...SelectorState1'}</p>}>
        <StateString state={SelectorState1}/>
      </Suspense>
      <Suspense fallback={<p>{'loading...AtomState1  WithTransition'}</p>}>
        <StateString state={AtomState1} withTransition={true}/>
      </Suspense>
      <Suspense fallback={<p>{'loading...SelectorState1  WithTransition'}</p>}>
        <StateString state={SelectorState1} withTransition={true}/>
      </Suspense>
    </>
  );
}

export const PromiseState = wrapFiddichRoot(PromiseStateInternal);