import { atom } from "fiddich";
import { FC } from "react";
import { ChangeStateButton, FiddichRootWrapper, StateString, SubFiddichRootWrapper } from "./share";

const AtomState1 = atom({
  key: 'AtomState1',
  default: 'atom1 default value',
});

const AtomState2 = atom({
  key: 'AtomState2',
  default: 'atom2 default value',
});

const AtomState3 = atom({
  key: 'AtomState3',
  default: 'atom3 default value',
});


export const SubRoot: FC = (props) => {
  return (
    <>
      <FiddichRootWrapper name="independent root" bgcolor="coral">
        <StateString state={AtomState1}/>
        <StateString state={AtomState3}/>
      </FiddichRootWrapper>
      <FiddichRootWrapper name="parent root" bgcolor="deepskyblue">
        <StateString state={AtomState2}/>
        <SubFiddichRootWrapper name="child root" bgcolor="skyblue">
          <StateString state={AtomState1} option={{place: {type: 'named', name: 'independent root'}}}/>
          <StateString state={AtomState2} option={{place: {type: 'hierarchical'}}}/>
          <StateString state={AtomState3}/>
          <ChangeStateButton state={AtomState1} option={{place: {type: 'named', name: 'independent root'}}}/>
          <ChangeStateButton state={AtomState2} option={{place: {type: 'hierarchical'}}}/>
          <ChangeStateButton state={AtomState3} />
        </SubFiddichRootWrapper>
      </FiddichRootWrapper>
    </>
  );
}