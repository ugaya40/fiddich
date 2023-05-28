/**
 * @jest-environment jsdom
 */

import React, { FC } from "react";
import { FiddichRoot, atom, selector } from "../src";
import { ChangeStateAsyncButton, ChangeStateButton, ResetStoreButton, StateValueBox } from "./TestComponents";
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import { sleep, waitForBoolean } from "./testUtil";

const atom1 = atom({
  name: 'atom1',
  default: 'atom1',
});

const selector1 = selector({
  name: 'selector1',
  get: ({get}) => {
    return `selector1-${get(atom1)}`;
  }
});

const selector2 = selector({
  name: 'selector2',
  getAsync: async ({get}) => {
    await sleep(30);
    const selector1Value = await get(selector1);
    return `selector2-${selector1Value}`;
  }
});

const Basic1: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox state={atom1}/>
      <StateValueBox state={selector1}/>
      <StateValueBox state={selector2}/>
      <ChangeStateButton state={atom1}/>
    </FiddichRoot>
  )
}

test('Sync State Base',async () => {
  const result = render(<Basic1/>);
  expect(screen.queryAllByText('RenderedCount: 1').length).toBe(2);
  expect(screen.queryAllByText('loading...').length).toBe(1);

  await waitForBoolean(() => screen.queryAllByText('RenderedCount: 1'), r => r.length === 3, 100);
  expect(screen.queryAllByText('SuspenseCount: 0').length).toBe(2);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(1);

  fireEvent.change(result.container.querySelector('#setValue-atom1')!, {target: {value: 'newAtom1Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeState-atom1'}));
  expect(screen.queryAllByText('loading...').length).toBe(1);
  await waitFor(() => screen.getByText('Value: selector2-selector1-newAtom1Value'));
  expect(screen.queryAllByText('SuspenseCount: 0').length).toBe(2);
  expect(screen.queryAllByText('SuspenseCount: 2').length).toBe(1);
  expect(screen.queryAllByText('RenderedCount: 2').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 4').length).toBe(1);
});

const atom2 = atom({
  name: 'atom2',
  asyncDefault: async () => {
    await sleep(30);
    return 'atom2';
  },
});

const selector3 = selector({
  name: 'selector3',
  getAsync: async ({get}) => {
    const atom2Value = await get(atom2);
    return `selector3-${atom2Value}`;
  }
});

const selector4 = selector({
  name: 'selector4',
  getAsync: async ({get}) => {
    await sleep(30);
    const selector1Value = await get(selector3);
    return `selector4-${selector1Value}`;
  }
});

const Basic2: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox state={atom2}/>
      <StateValueBox state={selector3}/>
      <StateValueBox state={selector4}/>
      <ChangeStateAsyncButton state={atom2}/>
    </FiddichRoot>
  )
}


test('Async State Base',async () => {
  const result = render(<Basic2/>);
  expect(screen.queryAllByText('loading...').length).toBe(3);

  await waitForBoolean(() => screen.queryAllByText('RenderedCount: 1'), r => r.length === 3, 100);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 2').length).toBe(3);

  fireEvent.change(result.container.querySelector('#setValue-atom2')!, {target: {value: 'newAtom2Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeStateAsync-atom2'}));
  expect(screen.queryAllByText('loading...').length).toBe(3);
  await waitFor(() => screen.getByText('Value: selector4-selector3-newAtom2Value'));

  expect(screen.queryAllByText('SuspenseCount: 2').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 2').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 4').length).toBe(3);
});

const atom3 = atom({
  name: 'atom3',
  asyncDefault: async () => {
    await sleep(30);
    return 'atom3';
  },
});

const selector5 = selector({
  name: 'selector5',
  getAsync: async ({get}) => {
    const atom3Value = await get(atom3);
    return `selector5-${atom3Value}`;
  }
});

const selector6 = selector({
  name: 'selector6',
  getAsync: async ({get}) => {
    await sleep(30);
    const selector5Value = await get(selector5);
    return `selector6-${selector5Value}`;
  }
});

const Basic3: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox suppressSuspenseWhenChange={true} state={atom3}/>
      <StateValueBox suppressSuspenseWhenChange={true} state={selector5}/>
      <StateValueBox suppressSuspenseWhenChange={true} state={selector6}/>
      <ChangeStateAsyncButton state={atom3}/>
    </FiddichRoot>
  )
}

test('Suppress Suspense - Change',async () => {
  const result = render(<Basic3/>);
  expect(screen.queryAllByText('loading...').length).toBe(3);

  await waitForBoolean(() => screen.queryAllByText('RenderedCount: 1'), r => r.length === 3, 100);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 2').length).toBe(3);

  fireEvent.change(result.container.querySelector('#setValue-atom3')!, {target: {value: 'newAtom3Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeStateAsync-atom3'}));

  expect(screen.queryAllByText('loading...').length).toBe(0);
  await waitFor(() => screen.getByText('Value: selector6-selector5-newAtom3Value'));

  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 2').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 3').length).toBe(3);
});

const Basic4: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox suppressSuspenseWhenReset={true} state={atom3}/>
      <StateValueBox suppressSuspenseWhenReset={true} state={selector5}/>
      <StateValueBox suppressSuspenseWhenReset={true} state={selector6}/>
      <ChangeStateAsyncButton state={atom3}/>
      <ResetStoreButton/>
    </FiddichRoot>
  )
}

test('Suppress Suspense - Init',async () => {
  const result = render(<Basic4/>);
  expect(screen.queryAllByText('loading...').length).toBe(3);

  await waitForBoolean(() => screen.queryAllByText('RenderedCount: 1'), r => r.length === 3, 100);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 2').length).toBe(3);

  fireEvent.change(result.container.querySelector('#setValue-atom3')!, {target: {value: 'newAtom3Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeStateAsync-atom3'}));

  expect(screen.queryAllByText('loading...').length).toBe(3);
  await waitFor(() => screen.getByText('Value: selector6-selector5-newAtom3Value'));

  expect(screen.queryAllByText('SuspenseCount: 2').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 2').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 4').length).toBe(3);

  fireEvent.click(screen.getByRole('button', {name: 'ResetStore'}));

  expect(screen.queryAllByText('loading...').length).toBe(0);
  await waitFor(() => screen.getByText('Value: selector6-selector5-atom3'));

  expect(screen.queryAllByText('SuspenseCount: 2').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 3').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 5').length).toBe(3);
});

const Basic5: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox suppressSuspenseWhenChange={true} suppressSuspenseWhenReset={true} state={atom3}/>
      <StateValueBox suppressSuspenseWhenChange={true} suppressSuspenseWhenReset={true} state={selector5}/>
      <StateValueBox suppressSuspenseWhenChange={true} suppressSuspenseWhenReset={true} state={selector6}/>
      <ChangeStateAsyncButton state={atom3}/>
      <ResetStoreButton/>
    </FiddichRoot>
  )
}

test('Suppress Suspense - Both',async () => {
  const result = render(<Basic5/>);
  expect(screen.queryAllByText('loading...').length).toBe(3);

  await waitForBoolean(() => screen.queryAllByText('RenderedCount: 1'), r => r.length === 3, 100);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 2').length).toBe(3);

  fireEvent.change(result.container.querySelector('#setValue-atom3')!, {target: {value: 'newAtom3Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeStateAsync-atom3'}));

  expect(screen.queryAllByText('loading...').length).toBe(0);
  await waitFor(() => screen.getByText('Value: selector6-selector5-newAtom3Value'));

  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 2').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 3').length).toBe(3);

  fireEvent.click(screen.getByRole('button', {name: 'ResetStore'}));

  expect(screen.queryAllByText('loading...').length).toBe(0);
  await waitFor(() => screen.getByText('Value: selector6-selector5-atom3'));

  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(3);
  expect(screen.queryAllByText('RenderedCount: 3').length).toBe(3);
  expect(screen.queryAllByText('TryRenderCount: 4').length).toBe(3);
});

const atom4 = atom({
  name: 'atom4',
  asyncDefault: async () => {
    await sleep(30);
    return 'atom4';
  },
});

const selector7 = selector({
  name: 'selector7',
  getAsync: async ({get}) => {
    const atom4Value = await get(atom4);
    return `selector7-${atom4Value}`;
  }
});

const selector8 = selector({
  name: 'selector8',
  getAsync: async ({get}) => {
    await sleep(30);
    const selector7Value = await get(selector7);
    return `selector8-${selector7Value}`;
  }
});

const Basic6: FC = () => {
  return (
    <FiddichRoot>
      <StateValueBox suppressSuspenseWhenChange={true} state={atom4}/>
      <StateValueBox suppressSuspenseWhenChange={true} state={selector7}/>
      <StateValueBox suppressSuspenseWhenChange={true} state={selector8}/>
      <ChangeStateAsyncButton state={atom4} time={50}/>
      <ResetStoreButton/>
    </FiddichRoot>
  )
}

test('Suppress Suspense - Change before initialization',async () => {
  const result = render(<Basic6/>);

  expect(screen.queryAllByText('loading...').length).toBe(3);

  fireEvent.change(result.container.querySelector('#setValue-atom4')!, {target: {value: 'newAtom4Value'}});
  fireEvent.click(screen.getByRole('button', {name: 'ChangeStateAsync-atom4'}));

  expect(screen.queryAllByText('loading...').length).toBe(3);

  await waitFor(() => screen.getByText('Value: selector8-selector7-newAtom4Value'));
  expect(screen.queryAllByText('Value: selector8-selector7-newAtom4Value').length).toBe(1);
  expect(screen.queryAllByText('Value: selector7-newAtom4Value').length).toBe(1);
  expect(screen.queryAllByText('Value: newAtom4Value').length).toBe(1);

  expect(screen.queryAllByText('SuspenseCount: 2').length).toBe(1);
  expect(screen.queryAllByText('SuspenseCount: 1').length).toBe(2);
  
  expect(screen.queryAllByText('RenderedCount: 1').length).toBe(3);

  expect(screen.queryAllByText('TryRenderCount: 3').length).toBe(1);
  expect(screen.queryAllByText('TryRenderCount: 2').length).toBe(2);
});