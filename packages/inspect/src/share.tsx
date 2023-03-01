import { Disposable, eventPublisher, EventPublisher, Selector } from "fiddich";
import { useInstance } from "fiddich";
import { Atom, FiddichState, useValue, useSetAtom, AtomValueOption, StorePlaceTypeHookContext, SetAtomOption, FiddichRoot, SubFiddichRoot } from "fiddich";
import { ComponentProps, FC, Suspense, SuspenseProps, useRef, useState, useMemo, createContext, useContext, useEffect, Component, ErrorInfo, ReactNode, useCallback } from "react";

type StateStringPropsType = {
  state: FiddichState<any>, 
  option?: AtomValueOption<any>,
}

const storePlaceString = (storePlace: StorePlaceTypeHookContext) => {
  if(storePlace.type === 'normal') {
    return 'normal';
  } else if(storePlace.type === 'hierarchical') {
    return 'hierarchical';
  } else if(storePlace.type === 'root') {
    return 'root';
  } else {
    return `"${storePlace.name}"`;
  }
}

type SuspenseWrapperContextType = {
  event: EventPublisher<number>
};

const SuspenseWrapperContext = createContext<SuspenseWrapperContextType | undefined>(undefined);

export const StateString: FC<StateStringPropsType> = (props) => {
  const suspenseWrapperContext = useContext(SuspenseWrapperContext);
  try {
    const value = useValue(props.state, props.option)
    const storePlace = storePlaceString(props.option?.place ?? {type: 'normal'});
    const noSuspense = props.option?.noSuspense ?? false;

    const instance = useInstance(props.state, props.option?.place ?? {type: 'normal'});
    instance.event.addListener(e => console.log(e))

    const renderCountRef = useRef(0);
    renderCountRef.current++;

    return(
      <div style={{backgroundColor: 'silver', border: '1px solid white'}}>
        <p style={{fontWeight: 'bold'}}>{`${props.state.key} value block`}</p>
        <div className="simple-table">
          {
            (props.state.type === 'selector' || props.state.type === 'selectorFamily') &&
            <>
              <div className="header"><span>selector getter :</span></div>
              {'get' in (props.state as Selector) && <div><span style={{color: 'green'}}>get</span></div>}
              {'getAsync' in (props.state as Selector) && <div><span>getAsync</span></div>}
            </>
          }
          <div className="header"><span>state-no-suspense :</span></div>
          <div><span style={{color: props.state.noSuspense ? 'green' : 'inherit'}}>{`${props.state.noSuspense ?? false}`}</span></div>
          <div className="header"><span>store :</span></div>
          <div><span style={{color: storePlace !== 'normal' ? 'green' : 'inherit'}}>{storePlace}</span></div>
          <div className="header"><span>no-suspense :</span></div>
          <div><span  style={{color: noSuspense ? 'green' : 'inherit'}}>{`${noSuspense}`}</span></div>
          <div className="header"><span>render-count :</span></div>
          <div><span>{renderCountRef.current}</span></div>
        </div>
        <p style={{color: 'mediumblue'}}>{value}</p>
      </div>
    )
  } catch(e) {
    if(e instanceof Promise) {
      suspenseWrapperContext?.event?.emit(1);
    }
    throw e;
  }
}

type ChangeStateButtonPropsType = {
  state: Atom<any>, 
  option?: SetAtomOption<any>
}

const inputCandidate = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ChangeStateButton: FC<ChangeStateButtonPropsType> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const promiseInputRef = useRef<HTMLInputElement>(null);
  const sleepMsRef = useRef<HTMLInputElement>(null);
  const inputCount = useRef(0);

  const setAtom = useSetAtom(props.state, props.option);
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const storePlace = storePlaceString(props.option?.place ?? {type: 'normal'});

  return(
    <div style={{backgroundColor: 'gold'}}>
      <p style={{fontWeight: 'bold'}}>{`${props.state.key} change button block`}</p>
      <div className="simple-table">
        <div className="header"><span>store :</span></div>
        <div><span style={{color: storePlace !== 'normal' ? 'green' : 'inherit'}}>{storePlace}</span></div>
        <div className="header"><span>render-count :</span></div>
        <div><span>{renderCountRef.current}</span></div>
      </div>
      <div style={{display: 'flex', gap: '5px'}}>
        <input defaultValue={inputCandidate[0]} ref={inputRef} type="text" style={{width: '100px'}}/>
        <button onClick={() => {
          setAtom(inputRef.current!.value);
          //rerender suppression
          inputCount.current++;
          inputRef.current!.value = inputCandidate[inputCount.current % 7];
          promiseInputRef.current!.value = inputCandidate[inputCount.current % 7];
        }}>change value</button>
      </div>
      <div style={{display: 'flex', gap: '5px'}}>
        <span>sleep:</span>
          <input ref={sleepMsRef} type="number" defaultValue={1000} style={{width: '60px', textAlign: 'end'}}/>
        <span>ms</span>
        <input ref={promiseInputRef} defaultValue={inputCandidate[0]} type="text" style={{width: '100px'}}/>
        <button onClick={() => {
          setAtom(async () => {
            const newValue = promiseInputRef.current!.value;
            const ms = Number(sleepMsRef.current!.value);
            await sleep(isNaN(ms) ? 1000 : ms);
            return newValue
          });
          //rerender suppression
          inputCount.current++;
          inputRef.current!.value = inputCandidate[inputCount.current % 7];
          promiseInputRef.current!.value = inputCandidate[inputCount.current % 7];
        }}>change value by promise(change value after sleep)
        </button>
      </div>
    </div>
  )
}

export const FiddichRootWrapper: FC<ComponentProps<typeof FiddichRoot> & {bgcolor?: string, color?: string}> = (props) => {
  const {children,bgcolor,color, ...other} = props;
  return (
    <FiddichRoot {...other}>
      <div style={{backgroundColor: bgcolor ?? 'whitesmoke'}}>
        <p style={{color: color ?? 'inherit'}}>
          <span style={{fontWeight: 'bold'}}>FiddichRoot</span>
          {props.name != null && <span>{`(${props.name})`}</span>}
        </p>
        <div style={{padding: '10px'}}>
          {props.children}
        </div>
      </div>
    </FiddichRoot>
  )
}

export const SubFiddichRootWrapper: FC<ComponentProps<typeof SubFiddichRoot> & {bgcolor?: string, color?: string}> = (props) => {
  const {children,bgcolor,color, ...other} = props;
  return (
    <SubFiddichRoot {...other}>
      <div style={{backgroundColor: bgcolor ?? 'whitesmoke'}}>
        <p style={{color: color ?? 'inherit'}}>
          <span style={{fontWeight: 'bold'}}>SubFiddichRoot</span>
          {props.name != null && <span>{`(${props.name})`}</span>}
        </p>
        <div style={{padding: '10px'}}>
          {props.children}
        </div>
      </div>
    </SubFiddichRoot>
  )
}

function useSafeState<T>(initialValue: T | (() => T)): [T, (arg: T | ((old: T) => T)) => void] {
  const mountRef = useRef(false);
  const [value,setValue] = useState(initialValue);
  
  useMemo(() => {
    mountRef.current = true;
  },[]);

  const wrappedSetValue = useCallback((arg: T | ((old: T) => T) ) => {
    if(mountRef.current) setValue(arg);
  },[]);

  useEffect(() => {
    return () => {mountRef.current = false;}
  },[])

  return [value,wrappedSetValue];
}

const SuspenseCount = () => {
  const context = useContext(SuspenseWrapperContext);
  const [count, setCount] = useSafeState(0);
  const listenerRef = useRef<Disposable | null>(null);
  useMemo(() => {
    listenerRef.current = context!.event.addListener(() => {
      setTimeout(() => setCount(old => old + 1),0);
    });
  },[])
  useEffect(() => {
    return () => listenerRef.current?.dispose();
  },[]);

  return <>{`suspense-count : ${count}`}</>
}

export const SuspenseWrapper: FC<SuspenseProps> = (props) => {
  const contextValue: SuspenseWrapperContextType = useMemo(() => {
    const pub = eventPublisher<number>();
    return {
      event: pub,
    }
  },[]);
  return (
    <SuspenseWrapperContext.Provider value={contextValue}>
      <div style={{backgroundColor: 'gainsboro', border: '1px solid white'}}>
        <p>
          <span style={{fontWeight: 'bold'}}>Suspense</span>
          <span style={{marginLeft: '10px'}}>{<SuspenseCount/>}</span>
        </p>
        <Suspense fallback={props.fallback ?? <p>loading...</p>}>
          <div style={{padding: '5px'}}>
            {props.children}
          </div>
        </Suspense>
      </div>
    </SuspenseWrapperContext.Provider>
  )
}

type ErrorBoundaryPropsType = {
  fallback?: ReactNode, 
  children: ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryPropsType, { hasError: boolean }> {
  constructor(props: ErrorBoundaryPropsType) {
    super(props);
    this.state = {
      hasError: false,
    };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }


  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  }

  render() {
    if (this.state.hasError) {
      return <>{this.props.fallback ?? <p>error</p>}</>;
    }
    return <>{this.props.children}</>;
  }
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r,ms));

export function managedPromise<T>(value: T) {
  let resolveFunc: ((value: T) => void) | undefined = undefined;
  return [new Promise<T>(resolve => {resolveFunc = resolve}), () => resolveFunc!(value) ] as const
}