import { ComponentType, FC, ReactNode, useContext, useEffect, useRef } from "react";
import type { FiddichStore } from "../shareTypes";
import { SelectorInstance } from "../selector";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";
import { useChangedValue } from "../hooks/useChangedValue";
import { eventPublisher } from "../util/event";
import { storeInfoEventEmitter } from "../globalFiddichEvent";

export const FiddichRoot: FC<{children?: ReactNode, contextKey?: string}> = (props) => {
  const storeRef = useRef<FiddichStore>({
    id: generateRandomKey(), 
    map: new Map(), 
    event: eventPublisher(), 
    children: [], 
    contextKey: props.contextKey});

  const parent = useContext(FiddichStoreContext);

  useChangedValue(props.contextKey, {
    effect: current => {storeRef.current.contextKey = current}
  });

  useChangedValue(parent, {
    effect: current => {
      if(current != null) {
        current.children.push(storeRef.current);
      }
    },
    cleanup: current => {
      if(current != null) {
        current.children = current.children.filter(child => child !== storeRef.current);
      }
    }
  });

  useEffect(() => {
    storeInfoEventEmitter.fireStoreCreated(storeRef.current);
    return () => {
      storeRef.current.event.emit('destroy');
      storeInfoEventEmitter.fireStoreDestroyed(storeRef.current);
    };
  },[]);

  return (
    <FiddichStoreContext.Provider value={storeRef.current}>
      {props.children}
    </FiddichStoreContext.Provider>
  )
}

export function wrapFiddichRoot<P extends Record<string, unknown>>(Component: ComponentType<P>): FC<P> {
  return (props) => (
    <FiddichRoot>
      <Component {...props}/>
    </FiddichRoot>
  );
}