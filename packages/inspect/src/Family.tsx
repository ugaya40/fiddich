import { atomFamily, FiddichRoot, selectorFamily } from 'fiddich';
import { FC, Suspense } from 'react';
import { sleep, StateString } from './share';

const AtomFamilyState1 = atomFamily<string, number>({
  key: 'AtomFamily1',
  default: arg => `atomFamily-parameter-${arg}`
});

const SelectorFamilyState1 = selectorFamily<string, number>({
  key: 'SelectorFamilyState1',
  getAsync: async ({get, parameter}) => {
    const atom1 = await get(AtomFamilyState1(parameter));
    await sleep(3000);
    return `selectorFamily-parameter-${atom1}`
  }
});



export const Family: FC = (props) => {
  return (
    <FiddichRoot>
      <StateString state={AtomFamilyState1(4)}/>
      <StateString state={SelectorFamilyState1(3)}/>
    </FiddichRoot>
  );
}