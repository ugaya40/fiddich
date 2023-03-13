import { ComponentType, FC, ReactNode, useContext, useEffect, useRef } from "react";
import type { SubFiddichStore } from "../shareTypes";
import { SelectorInstance } from "../selector";
import { useRerender } from "../hooks/useRerender";
import { generateRandomKey } from "../util/util";
import { FiddichStoreContext } from "../util/const";

export const SubFiddichRoot: FC<{children?: ReactNode}> = (props) => {

  const parent = useContext(FiddichStoreContext);
  if(parent == null) throw new Error('SubFiddichRoot can only be used inside FiddichRoot.');

  const rerender = useRerender();
  const storeRef = useRef<SubFiddichStore>({id: generateRandomKey(), map: new Map(), parent});
  if(storeRef.current.parent.id !== parent.id) {
    storeRef.current.parent = parent;
    rerender();
  }

  useEffect(() => {
    return () => {
      storeRef.current.map.forEach(value => {
        if(value.state.type === 'selector') {
          (value as SelectorInstance<unknown>).stateListeners.forEach(({listener}) => listener.dispose());
        }
      })
    }
  }, []);

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