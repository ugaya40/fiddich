import { ComponentType, FC, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import type { SubFiddichStore } from "../shareTypes";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";
import { useChangedValue } from "../hooks/useChangedValue";
import { eventPublisher } from "../util/event";
import { storeInfoEventEmitter } from "../globalFiddichEvent";

export const SubFiddichRoot: FC<{children?: ReactNode}> = (props) => {

  const parent = useContext(FiddichStoreContext);
  if(parent == null) throw new Error('SubFiddichRoot can only be used inside FiddichRoot.');

  const storeRef = useRef<SubFiddichStore>({
    id: generateRandomKey(), 
    map: new Map(),
    event: eventPublisher(),
    parent});
  
  useMemo(() => storeInfoEventEmitter.fireStoreCreated(storeRef.current),[]);


  useChangedValue(parent, {
    init: current => {
      storeRef.current.parent = current;
    },
    effect: (current, old) => {
      storeRef.current.parent = current;
    }
  })

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

export function wrapSubFiddichRoot<P extends Record<string, unknown>>(Component: ComponentType<P>): FC<P> {
  return (props) => (
    <SubFiddichRoot>
      <Component {...props}/>
    </SubFiddichRoot>
  );
}