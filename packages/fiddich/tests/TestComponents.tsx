import React, { useRef, FC, Suspense, useState } from "react";
import { FiddichState, useValue, StorePlaceTypeHookContext, useSetAtom, Atom, AtomFamily, AsyncAtom, AsyncAtomFamily, useNearestStore } from "../src";
import { sleep } from "./testUtil";

type SuspenseCounterProps = {
  counter: {
    tryRenderCount: number,
    renderedCount: number,
    suspenseCount: number
  }
}

type StateValueProps = SuspenseCounterProps & {
  state: FiddichState<any>,
  place?: StorePlaceTypeHookContext,
  suppressSuspenseWhenReset?: boolean,
  suppressSuspenseWhenChange?: boolean,
  counter: {
    tryRenderCount: number,
    renderedCount: number,
    suspenseCount: number
  }
}

type StateValueBoxProps = Omit<StateValueProps, 'counter'>

const StateValue: FC<StateValueProps> = props => {
  try {
    props.counter.tryRenderCount++;
    const value = useValue(props.state, {
      place: props.place, 
      suppressSuspense: {
        onReset: props.suppressSuspenseWhenReset,
        onChange: props.suppressSuspenseWhenChange
      }
    });
    props.counter.renderedCount++;
    return (
      <p>
        <span>{`TryRenderCount: ${props.counter.tryRenderCount}`}</span>
        <span>{`RenderedCount: ${props.counter.renderedCount}`}</span>
        <span>{`SuspenseCount: ${props.counter.suspenseCount}`}</span>
        <span>{`Value: ${value}`}</span>
      </p>
    )
  } catch(e) {
    if(e instanceof Promise) {
      props.counter.suspenseCount++;
    }
    throw e;
  }
}

export const StateValueBox: FC<StateValueBoxProps> = props => {
  const suspenseCounterRef = useRef<SuspenseCounterProps['counter']>({
    tryRenderCount: 0,
    renderedCount: 0,
    suspenseCount: 0
  });
  return (
    <div>
      <p>
        <span>{`State: ${props.state.name}`}</span>
      </p>
      <Suspense fallback={<span>loading...</span>}>
        <StateValue counter={suspenseCounterRef.current} {...props}/>
      </Suspense>
    </div>
  )
}

export const ChangeStateButton: FC<{state: Atom<any> | AtomFamily<any,any>, place?: StorePlaceTypeHookContext,}> = props => {
  const setValue = useSetAtom(props.state, {place: props.place});
  const [inputText, setInputText] = useState('');
  return (
    <p>
      <label htmlFor={`setValue-${props.state.name}`}>{`setValue-${props.state.name}`}</label>
      <input id={`setValue-${props.state.name}`} type="text" value={inputText} onChange={e => setInputText(e.target.value)}/>
      <button role="button" onClick={() => setValue(inputText)}>{`ChangeState-${props.state.name}`}</button>
    </p>
  )
}

export const ChangeStateAsyncButton: FC<{state: AsyncAtom<any> | AsyncAtomFamily<any,any>, place?: StorePlaceTypeHookContext, time?: number}> = props => {
  const setValue = useSetAtom(props.state, {place: props.place});
  const [inputText, setInputText] = useState('');
  return (
    <p>
      <label htmlFor={`setValue-${props.state.name}`}>{`setValue-${props.state.name}`}</label>
      <input id={`setValue-${props.state.name}`} type="text" value={inputText} onChange={e => setInputText(e.target.value)}/>
      <button role="button" onClick={() => setValue(async () => {
        await sleep(props.time ?? 30);
        return inputText;
      })}>{`ChangeStateAsync-${props.state.name}`}</button>
    </p>
  )
}

export const ResetStoreButton: FC = props => {
  const store = useNearestStore();
  return (
    <p>
      <button role="button" onClick={() => {
        store.reset();
      }}>{`ResetStore`}</button>
    </p>
  )
}