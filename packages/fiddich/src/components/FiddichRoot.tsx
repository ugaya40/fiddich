import { nanoid } from "nanoid";
import { ComponentType, FC, ReactNode, useRef } from "react";
import { FiddichStore, FiddichStoreContext } from "../core";

export const FiddichRoot: FC<{children?: ReactNode}> = (props) => {
  const storeRef = useRef<FiddichStore>({id: nanoid(), map: new Map()});

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