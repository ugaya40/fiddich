import { atom, FiddichRoot } from "fiddich";
import { FC, Suspense } from "react";
import { managedPromise, StateString } from "./share";


const [AtomState1DefaultvaluePromise, resolveAtomState1Defaultvalue] = managedPromise('AtomState1 resolved')

const AtomState1 = atom({
  key: 'AtomState1',
  default: AtomState1DefaultvaluePromise
});

export const PromiseState: FC = (props) => {
  return (
    <FiddichRoot>
      <br/>
      <button onClick={() => resolveAtomState1Defaultvalue()}>resolve AtomState1 defaultValue</button>
      <Suspense fallback={<p>{'loading...'}</p>}>
        <StateString state={AtomState1}/>
      </Suspense>
    </FiddichRoot>
  );
}