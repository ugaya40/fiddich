import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, useEffect, useRef } from "react";
import { FiddichStore, FiddichStoreContext } from "../core";
import { SelectorInstance } from "../selector";

export const FiddichRoot: FC<{children?: ReactNode}> = (props) => {
  const storeRef = useRef<FiddichStore>({id: nanoid(), map: new Map(), forSuspense: {dataMap: new Map(), promiseMap: new Map()}});

  useEffect(() => {
    return () => {
      storeRef.current.map.forEach(value => {
        if(value.state.type === 'selector') {
          (value as SelectorInstance).stateListeners.forEach(({listener}) => listener.dispose());
        }
      })
    }
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