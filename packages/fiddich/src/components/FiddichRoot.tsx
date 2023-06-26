import { ComponentType, FC, ReactNode, useEffect, useMemo, useRef } from "react";
import type { FiddichStore } from "../shareTypes";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";
import { eventPublisher } from "../util/event";
import { storeInfoEventEmitter } from "../globalFiddichEvent";

export const FiddichRoot: FC<{children?: ReactNode}> = (props) => {
  const storeRef = useRef<FiddichStore>({
    id: generateRandomKey(), 
    map: new Map(), 
    event: eventPublisher()});
  
  useMemo(() => storeInfoEventEmitter.fireStoreCreated(storeRef.current),[]);

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