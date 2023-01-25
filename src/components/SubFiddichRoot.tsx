import { nanoid } from "nanoid";
import { FC, ReactNode, useContext, useRef } from "react";
import { FiddichStoreContext, SubFiddichStore } from "../core";

export const SubFiddichRoot: FC<{children?: ReactNode}> = (props) => {

  const parent = useContext(FiddichStoreContext);
  if(parent == null) throw new Error('');

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