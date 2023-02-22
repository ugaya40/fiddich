import { atom, selector, FiddichRoot } from 'fiddich';
import { FC } from 'react';
import { ChangeStateButton, StateString } from './share';

const AtomState1 = atom({
  key: 'AtomState1',
  default: 'atom1 default value',
});

const SelectorState1 = selector({
  key: 'SelectorState1',
  getAsync: async ({get}) => {
    const atom1 = await get(AtomState1);
    return `selector1 - ${atom1}`
  }
});

const SelectorState2 = selector({
  key: 'SelectorState2',
  get: ({get}) => {
    const selector1 = get(SelectorState1);
    return `selector2 - ${selector1}`
  }
});


export const Basic: FC = (props) => {
  try {
    return (
      <FiddichRoot>
        <StateString state={AtomState1}/>
        <StateString state={SelectorState1}/>
        <StateString state={SelectorState2}/>
        <ChangeStateButton  state={AtomState1}/>
      </FiddichRoot>
    );
  }
  catch(e) {
    console.log(e);
    throw e;
  }
}