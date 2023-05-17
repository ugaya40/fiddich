import { FiddichStateInstance } from '../shareTypes';
import { invalidStatusErrorText } from '../util/const';

export function getValue<T>(instance: FiddichStateInstance<T>): T | Promise<T> {
  const status = instance.status;
  if (status.type === 'stable') {
    return status.value;
  } else if ('abortRequest' in status) {
    return new Promise<T>(async (resolve, reject) => {
      await status.promise;
      const newStatus = instance.status;
      if (newStatus.type === 'stable') {
        resolve(newStatus.value);
      } else if (newStatus.type === 'error') {
        reject(newStatus.error);
      } else {
        resolve(getValue(instance));
      }
    });
  } else if (status.type === 'error') {
    throw status.error;
  } else {
    throw new Error(invalidStatusErrorText);
  }
}

export const getStableValue = <T>(instance: FiddichStateInstance<T>) => {
  const status = instance.status;
  if (status.type === 'error' || status.type === 'unknown' || status.type === 'waiting for initialize') return undefined;
  return status.type === 'stable' ? status.value : status.oldValue;
};
