import { Atom, AtomFamily, FiddichState, useFiddichValue, useSetFiddichAtom } from "fiddich";
import { FC, useRef } from "react";

export const StateString: FC<{state: FiddichState<any>, initialValue?: string, withTransition?: boolean}> = (props) => {
  const value = useFiddichValue(props.state, {initialValue: props.initialValue, withTransition: props.withTransition});
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  return(
    <div style={{backgroundColor: 'gray'}}>
      <p style={{fontWeight: 'bold'}}>{(props.withTransition ?? true) ? `${props.state.key} value block (With Transition)` : `${props.state.key} value block`}</p>
      <p>{`render-count: ${renderCountRef.current}`}</p>
      <p>{value}</p>
    </div>
  )
}

export const ChangeStateButton: FC<{state: Atom<any> | AtomFamily<any>}> = (props) => {
  const setValue = useSetFiddichAtom(props.state);
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  return(
    <div style={{backgroundColor: 'green'}}>
      <p style={{fontWeight: 'bold'}}>{`${props.state.key} change button block`}</p>
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