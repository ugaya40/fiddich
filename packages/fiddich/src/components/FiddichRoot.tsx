import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, Suspense, useEffect, useRef } from "react";
import { FiddichStore, FiddichStoreContext } from "../core";
import { SelectorInstance } from "../selector";

export const FiddichRoot: FC<{children?: ReactNode}> = (props) => {
  const storeRef = useRef<FiddichStore>({id: nanoid(), map: new Map()});

  useEffect(() => {
    return () => {
      storeRef.current.map.forEach(value => {
        if(value.state.type === 'selector' || value.state.type === 'selectorFamily') {
          (value as SelectorInstance<unknown>).stateListeners.forEach(({listener}) => listener.dispose());
        }
      })
    }
  },[]);

  return (
    <FiddichStoreContext.Provider value={storeRef.current}>
      <Suspense>
        {props.children}
      </Suspense>
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