import { startTransition, useCallback, useState } from 'react';

export function useRerender(withTransition?: boolean) {
  const setFlg = useState(0)[1];
  return useCallback(() => {
    withTransition ?? false ? startTransition(() => setFlg(old => old + 1)) : setFlg(old => old + 1);
  }, []);
}
