import { useCallback, useState } from 'react';

export function useRerender() {
  const setFlg = useState(false)[1];
  return useCallback(() => {
    setFlg(old => !old);
  }, [setFlg]);
}
