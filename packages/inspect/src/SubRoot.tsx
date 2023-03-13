import { atom } from "fiddich";
import { FC } from "react";
import { ChangeStateButton, FiddichRootWrapper, StateString, SubFiddichRootWrapper, SuspenseWrapper } from "./share";

const AtomState1 = atom({
  key: 'AtomState1',
  asyncDefault: 'atom1 default value',
});

const AtomState2 = atom({
  key: 'AtomState2',
  asyncDefault: 'atom2 default value',
});

const AtomState3 = atom({
  key: 'AtomState3',
  asyncDefault: 'atom3 default value',
});


export const SubRoot: FC = (props) => {
  return (
    <>
      <FiddichRootWrapper name="independent root" bgcolor="coral">
        <SuspenseWrapper>
          <StateString state={AtomState1}/>
        </SuspenseWrapper>
        <SuspenseWrapper>
          <StateString state={AtomState3}/>
        </SuspenseWrapper>
      </FiddichRootWrapper>
      <FiddichRootWrapper name="parent root" bgcolor="deepskyblue">
        <SuspenseWrapper>
          <StateString state={AtomState2}/>
        </SuspenseWrapper>
        <SubFiddichRootWrapper name="child root" bgcolor="skyblue">
          <SuspenseWrapper>
            <StateString state={AtomState1} option={{place: {type: 'named', name: 'independent root'}}}/>
          </SuspenseWrapper>
          <SuspenseWrapper>
            <StateString state={AtomState2} option={{place: {type: 'hierarchical'}}}/>
          </SuspenseWrapper>
          <SuspenseWrapper>
            <StateString state={AtomState3}/>
          </SuspenseWrapper>
          <ChangeStateButton state={AtomState1} option={{place: {type: 'named', name: 'independent root'}}}/>
          <ChangeStateButton state={AtomState2} option={{place: {type: 'hierarchical'}}}/>
          <ChangeStateButton state={AtomState3} />
        </SubFiddichRootWrapper>
      </FiddichRootWrapper>
    </>
  );
}