import { Atom, AtomFamily, FiddichState, useValue, useNearestValue, useSetAtom, useSetNearestAtom } from "fiddich";
import { FC, Suspense, useRef } from "react";

/* eslint react-hooks/rules-of-hooks: 0 */

const StateStringInternal: FC<{state: FiddichState<any>, initialValue?: string, withTransition?: boolean, forceNearest?: boolean, trace?: boolean}> = (props) => {
  const value = props.forceNearest ? 
    useNearestValue(props.state, {initialValue: props.initialValue, withTransition: props.withTransition}) : 
    useValue(props.state, {initialValue: props.initialValue, withTransition: props.withTransition});
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  if(props.trace) {
    console.trace()
  }
  return(
    <div style={{backgroundColor: 'gray'}}>
      <p style={{fontWeight: 'bold'}}>{props.withTransition ? `${props.state.key} value block (With Transition)` : `${props.state.key} value block`}</p>
      {props.forceNearest && <p style={{fontWeight: 'bold'}}>{'(force Nearest Store)'}</p>}
      <p>{`render-count: ${renderCountRef.current}`}</p>
      <p>{value}</p>
    </div>
  )
}

export const StateString: FC<{state: FiddichState<any>, initialValue?: string, withTransition?: boolean, forceNearest?: boolean, trace?: boolean}> = (props) => {
  return (
    <Suspense fallback={<p>{`loading...${props.state.key}  ${props.withTransition ? '': 'with transition'}`}</p>}>
      <StateStringInternal {...props}/>
    </Suspense>
  )
}

export const ChangeStateButton: FC<{state: Atom<any> | AtomFamily<any>, forceNearest?: boolean}> = (props) => {
  const setValue = props.forceNearest ? 
    useSetNearestAtom(props.state): 
    useSetAtom(props.state);
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  return(
    <div style={{backgroundColor: 'green'}}>
      <p style={{fontWeight: 'bold'}}>{`${props.state.key} change button block`}</p>
      {props.forceNearest && <p style={{fontWeight: 'bold'}}>{'(force Nearest Store)'}</p>}
      <p>{`render-count: ${renderCountRef.current}`}</p>
      <button onClick={() => setValue(Date.now().toString())}>change</button>
    </div>
  )
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r,ms));

export function managedPromise<T>(value: T) {
  let resolveFunc: ((value: T) => void) | undefined = undefined;
  return [new Promise<T>(resolve => {resolveFunc = resolve}), () => resolveFunc!(value) ] as const
}