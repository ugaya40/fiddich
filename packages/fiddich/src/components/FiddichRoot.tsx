import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, Suspense, useEffect, useRef } from "react";
import { FiddichStore, FiddichStoreContext, globalStoreMap } from "../share";
import { SelectorInstance } from "../selector";

export const FiddichRoot: FC<{children?: ReactNode, name?: string}> = (props) => {
  const storeRef = useRef<FiddichStore>({id: nanoid(), map: new Map(), name: props.name});
  const nameRef = useRef<string | undefined>(undefined);

  if(props.name !== nameRef.current) {
    if(nameRef.current != null) {
      globalStoreMap.delete(nameRef.current);
    }
    if(props.name != null) {
      globalStoreMap.set(props.name, storeRef.current);
    }

    nameRef.current = props.name;
  }

  useEffect(() => {
    return () => {
      if(nameRef.current != null) {
        globalStoreMap.delete(nameRef.current);
      }
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