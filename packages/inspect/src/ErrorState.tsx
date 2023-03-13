import { atom, selector } from 'fiddich';
import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ChangeStateButton, FiddichRootWrapper, StateString, SuspenseWrapper } from './share';

const AtomState1 = atom({
  key: 'AtomState1',
  asyncDefault: 'atom1 default value',
});

const AtomState2 = atom({
  key: 'AtomState2',
  default: () => {
    throw new Error('AtomState2 not allowed');
    return 'never';
  },
});

const SelectorState1 = selector({
  key: 'SelectorState1',
  getAsync:  async({get}) => {
    const atom1 = await get(AtomState1);
    if(atom1 === 'Friday') throw new Error('Friday not allowed');
    return `selector1 - ${atom1}`
  }
});

const SelectorState2 = selector({
  key: 'SelectorState2',
  noSuspense: true,
  get: ({get}) => {
    const atom2 = get(AtomState2);
    return `selector2 - ${atom2}`
  }
});


export const ErrorState: FC = (props) => {
  return (
    <FiddichRootWrapper>
      <SuspenseWrapper>
        <StateString state={AtomState1}/>
      </SuspenseWrapper>
      <ErrorBoundary  fallback={<p>AtomState2 error....</p>}>
        <SuspenseWrapper>
          <StateString state={AtomState2}/>
        </SuspenseWrapper>
      </ErrorBoundary>
      <ErrorBoundary  fallback={<p>SelectorState1 error....</p>}>
        <SuspenseWrapper>
          <StateString state={SelectorState1}/>
        </SuspenseWrapper>
      </ErrorBoundary>
      <ErrorBoundary fallback={<p>SelectorState2 error....</p>}>
        <SuspenseWrapper>
          <StateString state={SelectorState2}/>
        </SuspenseWrapper>
      </ErrorBoundary>
      <ChangeStateButton state={AtomState1}/>
    </FiddichRootWrapper>
  );
}