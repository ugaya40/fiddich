import { atom, selector, FiddichRoot } from 'fiddich';
import { FC } from 'react';
import { ChangeStateButton, StateString } from './share';

const AtomState1 = atom({
  key: 'AtomState1',
  default: 'atom1 default value',
});

const SelectorState1 = selector({
  key: 'SelectorState1',
  get: async ({get}) => {
    const atom1 = await get(AtomState1);
    return `selector1 - ${atom1}`
  }
});

const SelectorState2 = selector({
  key: 'SelectorState2',
  get: async ({get}) => {
    const selector1 = await get(SelectorState1);
    return `selector2 - ${selector1}`
  }
});


export const Basic: FC = (props) => {
  return (
    <FiddichRoot>
      <StateString state={AtomState1} withTransition={true}/>
      <StateString state={SelectorState1} withTransition={true}/>
      <StateString state={SelectorState2} withTransition={true}/>
      <ChangeStateButton  state={AtomState1}/>
    </FiddichRoot>
  );
}