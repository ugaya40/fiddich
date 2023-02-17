import { atom, FiddichRoot, SubFiddichRoot } from "fiddich";
import { FC, useState } from "react";
import { ChangeStateButton, StateString } from "./share";

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
  const [show, setShow] = useState(false);
  return (
    <FiddichRoot>
      <StateString state={AtomState1}/>
      <StateString state={AtomState3}/>
      {show && 
        <>
          <StateString state={AtomState2}/>
          <ChangeStateButton  state={AtomState2}/>
        </>
      }
      <SubFiddichRoot>
        <div style={{padding: '10px', backgroundColor: 'lavender'}}>
          <StateString state={AtomState1}/>
          <StateString state={AtomState2} initialValue={'SubRoot AtomState2 Value'}/>
          <StateString state={AtomState3} forceNearest={true}/>
          <ChangeStateButton  state={AtomState1}/>
          <ChangeStateButton  state={AtomState2}/>
          <ChangeStateButton  state={AtomState3} forceNearest={true}/>
        </div>
      </SubFiddichRoot>
      <button onClick={() => setShow(old => !old)}>Reads a new AtomState2 under MainRoot</button>
      <br/>
      <span>When AtomState1 is read under SubFiddichRoot, it checks if AtomState1 exists in the parent FiddichRoot and reads that one if it exists.</span>
      <br/><br/>
      <span>If you try to read a new AtomState2 under MainRoot, a new AtomState2 will be created under MainRoot and should be out of sync, since AtomState2 was previously only under SubFiddicRoot.</span>
    </FiddichRoot>
  );
}