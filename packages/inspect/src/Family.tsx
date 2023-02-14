import { atomFamily, FiddichRoot } from 'fiddich';
import { FC } from 'react';
import { StateString } from './share';

const AtomFamilyState1 = atomFamily<string, number>({
  key: 'AtomFamily1',
  default: arg => `atomFamily-parameter-${arg}`
});



export const Family: FC = (props) => {
  return (
    <FiddichRoot>
      <StateString state={AtomFamilyState1(4)}/>
    </FiddichRoot>
  );
}