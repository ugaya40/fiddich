import { nanoid } from "nanoid";
import { ChangedByPromiseEvent, ChangedEvent, ErrorEvent, FiddichStateInstance, InitializedEvent, ResetEvent, WaitingEvent } from "../src";
import { waitFor } from "@testing-library/react";

//mock
(global.window as any) = {
  crypto: {
    getRandomValues: (array: Uint8Array) => {
      const randomValue = new TextEncoder().encode(nanoid(array.length))
      for (let i = 0; i < array.length; i++) {
        array[i] = randomValue[i]
      }
    }
  }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function managedPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return [
    promise,
    resolve!,
    reject!,
  ] as const;
}

type InstanceEventHistoryType<T> = {
  reset?: ResetEvent;
  initialized?: InitializedEvent<T>;
  waiting?: WaitingEvent;
  changed?: ChangedEvent;
  changedByPromise?: ChangedByPromiseEvent<T>;
  error?: ErrorEvent;
}

export function instanceEventHistory<T>(instance: FiddichStateInstance<T>): InstanceEventHistoryType<T>[] {
  const results: InstanceEventHistoryType<T>[] = [];

  instance.event.addListener(event => {

    const result: InstanceEventHistoryType<T> = {};

    if(event.type === 'reset') {
    const result: InstanceEventHistoryType<T> = {};
      result.reset = event;
    } else if(event.type === 'error') {
      result.error = event;
    } else if(event.type === 'initialized') {
      result.initialized = event;
    } else if(event.type === 'waiting') {
      result.waiting = event;
    } else if(event.type === 'change') {
      result.changed = event
    } else if(event.type === 'change by promise') {
      result.changedByPromise = event;
    }

    results.push(result);
  });

  return results;
}

export const waitForBoolean = async <T>(action: () => T, condition: (result: T) => boolean, timeout?: number) => {
  await waitFor(() => {
    const result = action();
    if(!condition(result)) {
      throw new Error();
    }
  },{timeout})
}

