import { ComponentType, FC, ReactNode, useEffect, useRef } from "react";
import type { FiddichStore } from "../shareTypes";
import { SelectorInstance } from "../selector";
import { getOrAddNamedStore } from "../namedStore";
import { useRerender } from "../hooks/useRerender";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";

export const FiddichRoot: FC<{children?: ReactNode, name?: string}> = (props) => {
  const storeRef = useRef<FiddichStore>(
    props.name == null ?
      {id: generateRandomKey(), map: new Map()} :
      getOrAddNamedStore(props.name)
  );

  const rerender = useRerender();
  if(storeRef.current.name !== props.name) {
    if(props.name != null) {
      storeRef.current = getOrAddNamedStore(props.name);
    } else {
      storeRef.current = {id: generateRandomKey(), map: new Map()};
    }
    rerender();
  }

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