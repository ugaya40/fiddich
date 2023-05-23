import { WaitingForInitializeStatus } from '../shareTypes';
import { StateInstanceError } from '../stateUtil/StateInstanceError';
import { getStableValue } from '../stateUtil/getValue';
import { fireErrorEffect, fireInitEffect } from '../stateUtil/instanceOperation';
import {
  AsyncAtom,
  AsyncAtomFamily,
  AsyncAtomFamilyValueArg,
  AsyncAtomInstance,
  AsyncAtomValueArg,
  SyncAtom,
  SyncAtomFamily,
  SyncAtomFamilyValueArg,
  SyncAtomInstance,
  SyncAtomValueArg,
} from './atom';

export const initializeSyncAtom = <T, TCell>(atomInstance: SyncAtomInstance<T, TCell>, initialValue?: SyncAtomValueArg<T> | SyncAtomFamilyValueArg<T, any>) => {
  const syncAtom = atomInstance.state as SyncAtom<T, TCell> | SyncAtomFamily<T, any, TCell>;
  const parameter = syncAtom.type === 'atomFamily' ? syncAtom.parameter : undefined;

  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  atomInstance.cell = syncAtom.cell();

  try {
    const decidedInitialValue = initialValue ?? syncAtom.default;
    const actualInitialValue = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;

    atomInstance.status = {
      type: 'stable',
      value: actualInitialValue,
    };

    fireInitEffect(atomInstance, actualInitialValue);

    atomInstance.event.emit({ type: 'initialized', value: actualInitialValue, oldValue: undefined });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      fireErrorEffect(atomInstance, undefined, error);
      atomInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};

export const initializeAsyncAtom = <T, TCell>(
  atomInstance: AsyncAtomInstance<T, TCell>,
  initialValue?: AsyncAtomValueArg<T> | AsyncAtomFamilyValueArg<T, any>
) => {
  const asyncAtom = atomInstance.state as AsyncAtom<T, TCell> | AsyncAtomFamily<T, any, TCell>;
  const parameter = asyncAtom.type === 'atomFamily' ? asyncAtom.parameter : undefined;

  const oldValue = getStableValue(atomInstance);

  atomInstance.cell = asyncAtom.cell();

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingForInitializeStatus: WaitingForInitializeStatus<T> | undefined;

  const initializePromise = new Promise<void>(async resolve => {
    try {
      const decidedInitialValue = initialValue ?? asyncAtom.asyncDefault;
      const initialValuePromise = decidedInitialValue instanceof Function ? decidedInitialValue(parameter) : decidedInitialValue;
      const actualInitialValue = await initialValuePromise;
      if (!waitingForInitializeStatus!.abortRequest) {
        atomInstance.status = {
          type: 'stable',
          value: actualInitialValue,
        };

        fireInitEffect(atomInstance, actualInitialValue);

        atomInstance.event.emit({
          type: 'initialized',
          value: actualInitialValue,
          oldValue,
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(atomInstance, e);
        const errorInfo = { type: 'error', error } as const;
        atomInstance.status = errorInfo;
        fireErrorEffect(atomInstance, undefined, error);
        atomInstance.event.emit(errorInfo);
      } else {
        throw e;
      }
    }
    resolve();
  });

  waitingForInitializeStatus = {
    type: 'waiting for initialize',
    oldValue,
    abortRequest: false,
    promise: initializePromise,
  };

  atomInstance.status = waitingForInitializeStatus;
};
