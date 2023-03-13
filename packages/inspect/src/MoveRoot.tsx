import { atom } from "fiddich";
import { FC, useState } from "react";
import { ChangeStateButton, FiddichRootWrapper, StateString, SubFiddichRootWrapper, SuspenseWrapper } from "./share";

const AtomState1 = atom({
  key: 'AtomState1',
  asyncDefault: 'atom1 default value',
});

const MoveTarget = <SuspenseWrapper><StateString state={AtomState1}/></SuspenseWrapper>

export const MoveRoot: FC = (props) => {
  const [atomState1Position, setAtomState1Position] = useState<'parent' | 'child'>('child');
  return (
    <>
      <FiddichRootWrapper>
        <SuspenseWrapper>
          <StateString state={AtomState1}/>
        </SuspenseWrapper>
        {atomState1Position === 'parent' && MoveTarget}
        <ChangeStateButton state={AtomState1}/>
        <SubFiddichRootWrapper>
          <SuspenseWrapper>
            <StateString state={AtomState1}/>
          </SuspenseWrapper>
          {atomState1Position === 'child' && MoveTarget}
          <ChangeStateButton state={AtomState1}/>
        </SubFiddichRootWrapper>
      </FiddichRootWrapper>
      <button onClick={() => {setAtomState1Position(old => old === 'parent' ? 'child' : 'parent')}}>change AtomState1 value block position</button>
    </>
  )
}
