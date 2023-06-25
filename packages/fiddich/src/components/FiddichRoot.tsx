import { ComponentType, FC, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import type { FiddichStore } from "../shareTypes";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";
import { useChangedValue } from "../hooks/useChangedValue";
import { eventPublisher } from "../util/event";
import { storeInfoEventEmitter } from "../globalFiddichEvent";

export const FiddichRoot: FC<{children?: ReactNode}> = (props) => {
  const storeRef = useRef<FiddichStore>({
    id: generateRandomKey(), 
    map: new Map(), 
    event: eventPublisher(), 
    children: []});
  
  useMemo(() => storeInfoEventEmitter.fireStoreCreated(storeRef.current),[]);

  const parent = useContext(FiddichStoreContext);

  useChangedValue(parent, {
    init: current => {
      if(current != null) {
        current.children.push(storeRef.current);
      }
    },
    effect: (current, old) => {
      if(old != null) {
        old.children = old.children.filter(child => child !== storeRef.current);
      }
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
    return () => {
      storeRef.current.event.emit('finalize');
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