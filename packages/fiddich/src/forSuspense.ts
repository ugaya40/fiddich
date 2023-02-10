import { FiddichStore } from './core';

export type ErrorResult = {
  error: unknown;
};

export type PromiseResult = {
  promise: Promise<void>;
};

export type DataResult<T> = {
  data: T;
};

type Result<T> = DataResult<T> | ErrorResult | PromiseResult;

export function getDataForSuspense<T = any>(store: FiddichStore, key: string, data: Promise<T> | T): Result<T> {
  const mapKey = key;
  const { dataMap, promiseMap } = store.forSuspense;
  const mapData = dataMap.get(mapKey) as DataResult<T> | ErrorResult | undefined;

  const returnDataOrNewPromise = () => {
    if (data instanceof Promise) {
      const newPromise: Promise<void> = data
        .then(d => {
          dataMap.set(mapKey, { data: d });
        })
        .catch(r => {
          dataMap.set(mapKey, { error: r });
        })
        .finally(() => {
          promiseMap.delete(mapKey);
        });
      promiseMap.set(mapKey, newPromise);
      return { promise: newPromise };
    } else {
      const dataResult = { data };
      dataMap.set(mapKey, dataResult);
      return dataResult;
    }
  };

  if (mapData === undefined) {
    const promise = promiseMap.get(mapKey);
    if (promise != null) {
      return { promise };
    } else {
      return returnDataOrNewPromise();
    }
  } else if ('error' in mapData) {
    dataMap.delete(mapKey);
    return { error: mapData.error };
  } else {
    return mapData;
  }
}
