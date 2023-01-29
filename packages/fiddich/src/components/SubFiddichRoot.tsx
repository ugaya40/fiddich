import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, useContext, useRef } from "react";
import { FiddichStoreContext, SubFiddichStore } from "../core";

export const SubFiddichRoot: FC<{children?: ReactNode}> = (props) => {

  const parent = useContext(FiddichStoreContext);
  if(parent == null) throw new Error('SubFiddichRoot can only be used inside FiddichRoot.');

  const storeRef = useRef<SubFiddichStore>({id: nanoid(), map: new Map(), parent});
  if(storeRef.current.parent.id !== parent.id) {
    storeRef.current.parent = parent;
  }

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