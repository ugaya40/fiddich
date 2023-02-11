import { atom, FiddichRoot, selector } from "fiddich";
import { FC, Suspense } from "react";
import { StateString } from "./share";

const sleep = (ms: number) => new Promise(r => setTimeout(r,ms));

function managedPromise<T>(value: T) {
  let resolveFunc: ((value: T) => void) | undefined = undefined;
  return [new Promise<T>(resolve => {resolveFunc = resolve}), () => resolveFunc!(value) ] as const
}

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

export const PromiseState: FC = (props) => {

  return (
    <FiddichRoot>
      <br/>
      <button onClick={() => resolveRef!()}>resolve AtomState1 defaultValue</button>
      <Suspense fallback={<p>{'loading...AtomState1'}</p>}>
        <StateString state={AtomState1}/>
      </Suspense>
      <Suspense fallback={<p>{'loading...SelectorState1'}</p>}>
        <StateString state={SelectorState1}/>
      </Suspense>
    </FiddichRoot>
  );
}