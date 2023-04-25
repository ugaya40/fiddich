import { useCallback, useState } from 'react';

export function useRerender() {
  const setFlg = useState(false)[1];
  return useCallback(() => {
    setFlg(old => !old);
  }, [setFlg]);
}

// This suppresses a React warning that occurs when calling setState of another component during the rendering of a certain component.
// In this case, the setState is used internally for rerendering and is purely for triggering the rerendering.
// The warning that would occur if this approach was not adopted should not cause any issues of concern.
// It is important that the FiddichStateInstance's state is correct,
// and when React should perform rerendering based on the state of the FiddichStateInstance is not a critical issue,
// so this approach was adopted.
export function useRerenderAsync() {
  const setFlg = useState(false)[1];
  return useCallback(() => {
    new Promise<void>(resolve => {
      setFlg(old => !old);
      resolve();
    });
  }, [setFlg]);
}
