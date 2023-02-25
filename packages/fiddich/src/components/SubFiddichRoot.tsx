import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, useContext, useEffect, useRef } from "react";
import { FiddichStoreContext, globalStoreMap, SubFiddichStore } from "../core";
import { SelectorInstance } from "../selector";

export const SubFiddichRoot: FC<{children?: ReactNode, name?: string}> = (props) => {

  const parent = useContext(FiddichStoreContext);
  if(parent == null) throw new Error('SubFiddichRoot can only be used inside FiddichRoot.');

  const storeRef = useRef<SubFiddichStore>({id: nanoid(), map: new Map(), parent, name: props.name});
  if(storeRef.current.parent.id !== parent.id) {
    storeRef.current.parent = parent;
  }

  useEffect(() => {
    if(props.name != null) globalStoreMap.set(props.name, storeRef.current);

    return () => {
      if(props.name != null) globalStoreMap.delete(props.name);
      storeRef.current.map.forEach(value => {
        if(value.state.type === 'selector') {
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

export function wrapSubFiddichRoot<P extends Record<string, unknown>>(Component: ComponentType<P>): FC<P> {
  return (props) => (
    <SubFiddichRoot>
      <Component {...props}/>
    </SubFiddichRoot>
  );
}