import { Compare, WaitingStatus } from '../shareTypes';
import { StateInstanceError } from '../stateUtil/StateInstanceError';
import { getStableValue } from '../stateUtil/getValue';
import { fireChangeEffect, fireErrorEffect } from '../stateUtil/instanceOperation';
import { defaultCompareFunction } from '../util/const';
import { AsyncAtomInstance, SyncAtomInstance } from './atom';

export type SyncAtomSetterOrUpdaterArg<T> = T | ((old: T | undefined) => T);
export type AsyncAtomSetterOrUpdaterArg<T> = T | Promise<T> | ((old: T | undefined) => T | Promise<T>);
export type AtomSetterOrUpdaterArg<T> = SyncAtomSetterOrUpdaterArg<T> | AsyncAtomSetterOrUpdaterArg<T>;

export type SyncAtomSetterOrUpdater<T> = (setterOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => void;
export type AsyncAtomSetterOrUpdater<T> = (setterOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => void;
export type AtomSetterOrUpdater<T> = SyncAtomSetterOrUpdater<T> | AsyncAtomSetterOrUpdater<T>;

const getNewValueFromSyncAtom = <T>(valueOrUpdater: SyncAtomSetterOrUpdaterArg<T>, oldValue: T | undefined): T => {
  if (valueOrUpdater instanceof Function) {
    return valueOrUpdater(oldValue);
  } else {
    return valueOrUpdater;
  }
};

const getNewValueFromAsyncAtom = <T>(valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>, oldValue: T | undefined): T | Promise<T> => {
  if (valueOrUpdater instanceof Function) {
    return valueOrUpdater(oldValue);
  } else {
    return valueOrUpdater;
  }
};

export const changeAsyncAtomValue = <T>(atomInstance: AsyncAtomInstance<T, any>, valueOrUpdater: AsyncAtomSetterOrUpdaterArg<T>) => {
  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  const oldValue = getStableValue(atomInstance)!;

  //The status of instance may be overwritten while waiting for await,
  //so prepare it as a save destination to determine abortRequest.
  let waitingStatus: WaitingStatus<T> | undefined;

  const changeValuePromise = new Promise<void>(async resolve => {
    try {
      const newValue = await getNewValueFromAsyncAtom(valueOrUpdater, oldValue);
      if (!waitingStatus!.abortRequest) {
        atomInstance.status = {
          type: 'stable',
          value: newValue,
        };

        fireChangeEffect(atomInstance, oldValue, newValue);

        atomInstance.event.emit({
          type: 'change by promise',
          oldValue,
          newValue,
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        const error = new StateInstanceError(atomInstance, e);
        const errorInfo = { type: 'error', error } as const;
        atomInstance.status = errorInfo;
        fireErrorEffect(atomInstance, oldValue, error);
        atomInstance.event.emit(errorInfo);
      } else {
        throw e;
      }
    }

    resolve();
  });

  waitingStatus = {
    type: 'waiting',
    abortRequest: false,
    oldValue,
    promise: changeValuePromise,
  };

  atomInstance.status = waitingStatus;

  atomInstance.event.emit({ type: 'waiting', promise: changeValuePromise });
};

export const changeSyncAtomValue = <T>(atomInstance: SyncAtomInstance<T, any>, valueOrUpdater: SyncAtomSetterOrUpdaterArg<T>) => {
  if ('abortRequest' in atomInstance.status) atomInstance.status.abortRequest = true;

  const oldValue = getStableValue(atomInstance)!;
  try {
    const newValue = getNewValueFromSyncAtom(valueOrUpdater, oldValue);
    const compareFunction: Compare<T> = atomInstance.state.compare ?? defaultCompareFunction;
    if (compareFunction(oldValue, newValue)) return;

    atomInstance.status = {
      type: 'stable',
      value: newValue,
    };
    fireChangeEffect(atomInstance, oldValue, newValue);
    atomInstance.event.emit({ type: 'change', oldValue, newValue });
  } catch (e) {
    if (e instanceof Error) {
      const error = new StateInstanceError(atomInstance, e);
      const errorInfo = { type: 'error', error } as const;
      atomInstance.status = errorInfo;
      fireErrorEffect(atomInstance, oldValue, error);
      atomInstance.event.emit(errorInfo);
    } else {
      throw e;
    }
  }
};
