import { selectorInstanceInfoEventEmitter } from '../globalFiddichEvent';
import { WaitingForInitializeStatus } from '../shareTypes';
import { StateInstanceError } from '../stateUtil/StateInstanceError';
import { fireErrorEffect, fireInitEffect } from '../stateUtil/instanceOperation';
import { asyncGetterArg, syncGetterArg } from './getter';
import { AsyncSelector, AsyncSelectorFamily, AsyncSelectorInstance, SyncSelector, SyncSelectorFamily, SyncSelectorInstance } from './selector';

export const initializeSyncSelector = <T, TCell>(selectorInstance: SyncSelectorInstance<T, TCell>) => {
  const syncSelector = selectorInstance.state as SyncSelector<T, TCell> | SyncSelectorFamily<T, any, TCell>;
  const getterArg = syncGetterArg(selectorInstance);

  selectorInstance.cell = syncSelector.cell();

  try {
    selectorInstanceInfoEventEmitter.fireTryGetValueWhenInitialize(selectorInstance);
    const value = syncSelector.type === 'selectorFamily' ? syncSelector.get({ ...getterArg, param: syncSelector.parameter }) : syncSelector.get(getterArg);

    selectorInstance.status = {
      type: 'stable',
      value: value,
    };
    fireInitEffect(selectorInstance, value);
    selectorInstance.event.emit({ type: 'initialized', value: value });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(selectorInstance, e);
      const errorInfo = { type: 'error', error } as const;
      selectorInstance.status = errorInfo;
      fireErrorEffect(selectorInstance, undefined, error);
      selectorInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};

export const initializeAsyncSelector = <T, TCell>(selectorInstance: AsyncSelectorInstance<T, TCell>) => {
  const asyncSelector = selectorInstance.state as AsyncSelector<T, TCell> | AsyncSelectorFamily<T, any, TCell>;

  if('abortRequest' in selectorInstance.status) selectorInstance.status.abortRequest = true;

  selectorInstance.cell = asyncSelector.cell();

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus | undefined;

  const getterArg = asyncGetterArg(selectorInstance);

  const initializePromise = new Promise<void>(async resolve => {
    try {
      selectorInstanceInfoEventEmitter.fireTryGetValueWhenInitialize(selectorInstance);
      const value = await (asyncSelector.type === 'selectorFamily'
        ? asyncSelector.getAsync({ ...getterArg, param: asyncSelector.parameter })
        : asyncSelector.getAsync(getterArg));
      if (!waitingForInitializeStatus!.abortRequest) {
        selectorInstance.status = {
          type: 'stable',
          value: value,
        };
        fireInitEffect(selectorInstance, value);
        selectorInstance.event.emit({ type: 'initialized', value: value });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(selectorInstance, e);
        const errorInfo = { type: 'error', error } as const;
        selectorInstance.status = errorInfo;
        fireErrorEffect(selectorInstance, undefined, error);
        selectorInstance.event.emit(errorInfo);
      } else {
        throw e;
      }
    }
    resolve();
  });

  waitingForInitializeStatus = {
    type: 'waiting for initialize',
    abortRequest: false,
    promise: initializePromise,
  };

  selectorInstance.status = waitingForInitializeStatus;
};
