/**
 * @jest-environment jsdom
 */

import React, { FC, useState } from "react";
import { FiddichRoot, SubFiddichRoot, atom } from "../src";
import { ChangeStateButton, StateValueBox } from "./TestComponents";
import {fireEvent, render, screen} from '@testing-library/react'

const atom1 = atom({
  name: 'atom1',
  default: 'atom1',
});

const SubRoot: FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  return (  
    <FiddichRoot>
      <StateValueBox state={atom1}/> 
      <SubFiddichRoot>
        <StateValueBox state={atom1}/>
        <SubFiddichRoot>
          <StateValueBox state={atom1}  place={{type: 'hierarchical'}}/>
          {isVisible && <StateValueBox state={atom1}/>}
          <ChangeStateButton state={atom1} place={{type: 'hierarchical'}}/>
          <ChangeStateButton state={atom1} place={{type: 'root'}}/>
        </SubFiddichRoot>
      </SubFiddichRoot>
      <button onClick={() => setIsVisible(true)}>Display Low State</button>
    </FiddichRoot>
  )
}

test('SubRoot 1', () => {
  const result = render(<SubRoot/>);
  fireEvent.change(result.container.querySelectorAll('#setValue-atom1')[0]!, {target: {value: '1'}});
  fireEvent.click(screen.queryAllByRole('button', {name: 'ChangeState-atom1'})[0]);
  expect(screen.queryAllByText('Value: atom1').length).toBe(1);
  expect(screen.queryAllByText('Value: 1').length).toBe(2);

  fireEvent.change(result.container.querySelectorAll('#setValue-atom1')[1]!, {target: {value: '2'}});
  fireEvent.click(screen.queryAllByRole('button', {name: 'ChangeState-atom1'})[1]);
  expect(screen.queryAllByText('Value: 2').length).toBe(1);
  expect(screen.queryAllByText('Value: 1').length).toBe(2);

  fireEvent.click(screen.queryAllByRole('button', {name: 'Display Low State'})[0]);
  expect(screen.queryAllByText('Value: 2').length).toBe(1);
  expect(screen.queryAllByText('Value: 1').length).toBe(2);
  expect(screen.queryAllByText('Value: atom1').length).toBe(1);
});