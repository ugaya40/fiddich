import { atom, selector } from 'fiddich';
import { FC } from 'react';
import { ChangeStateButton, FiddichRootWrapper, sleep, StateString, SuspenseWrapper } from './share';

const AtomState1 = atom({
  key: 'AtomState1',
  default: 'atom1 default value',
});

const SelectorState1 = selector({
  key: 'SelectorState1',
  noSuspense: true,
  getAsync :  async ({get}) => {
    const atom1 = await get(AtomState1);
    return `selector1 - ${atom1}`
  }
});

const SelectorState2 = selector({
  key: 'SelectorState2',
  getAsync: async ({get}) => {
    await sleep(1000)
    const selector1 = await get(SelectorState1);
    return `selector2 - ${selector1}`
  }
});

const SelectorState3 = selector({
  key: 'SelectorState3',
  noSuspense: true,
  get: ({get}) => {
    const selector2 = get(SelectorState2);
    return `selector3 - ${selector2}`
  }
});


export const Basic: FC = (props) => {
  return (
    <FiddichRootWrapper>
      <SuspenseWrapper>
        <StateString state={AtomState1}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={SelectorState1}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={SelectorState2}/>
      </SuspenseWrapper>
      <SuspenseWrapper>
        <StateString state={SelectorState3}/>
      </SuspenseWrapper>
      <ChangeStateButton state={AtomState1}/>
    </FiddichRootWrapper>
  );
}