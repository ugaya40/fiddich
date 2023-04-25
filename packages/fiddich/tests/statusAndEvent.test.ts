import { atom, deleteNamedStoreIfExists, namedStore, selector } from "../src";
import { instanceEventHistory, managedPromise } from './testUtil';

const testStoreName = "testStore";

beforeEach(() => {
  namedStore(testStoreName);
});

afterEach(() => {
  deleteNamedStoreIfExists(testStoreName);
});

const syncAtom1 = atom({
  name: 'syncAtom1',
  default: 0
})

test('SyncAtom Event And Status', () => {
  const state = namedStore(testStoreName).state(syncAtom1);
  const instance = state.instance;
  expect(instance.status.type).toBe('stable');

  const eventResults = instanceEventHistory(instance);

  state.set(1);

  expect(eventResults[0].changed?.type).toBe('change');
  expect(eventResults[0].changed?.oldValue).toBe(0);
  expect(eventResults[0].changed?.newValue).toBe(1);

  expect(instance.status.type).toBe('stable');

  expect(namedStore(testStoreName).state(syncAtom1).get()).toBe(1);

  state.set(() => {throw new Error('test error')});

  expect(eventResults[1].error?.type).toBe('error');

  expect(instance.status.type).toBe('error');

  expect(() => namedStore(testStoreName).state(syncAtom1).get()).toThrow();

  state.set(2);

  expect(eventResults[2].changed?.type).toBe('change');
  expect(eventResults[2].changed?.oldValue).toBe(undefined);
  expect(eventResults[2].changed?.newValue).toBe(2);

  expect(instance.status.type).toBe('stable');

  expect(namedStore(testStoreName).state(syncAtom1).get()).toBe(2);
});

const asyncAtom1 = atom({
  name: 'asyncAtom1',
  asyncDefault: () => asyncAtom1Promise
});

const [asyncAtom1Promise, asyncAtom1Resolve] = managedPromise<number>()

test('AsyncAtom Event And Status', async () => { 

  // initialize - [set 1]
  const state = namedStore(testStoreName).state(asyncAtom1);
  const instance = state.instance;
  expect(instance.status.type).toBe('waiting for initialize');

  const eventResults = instanceEventHistory(instance);

  asyncAtom1Resolve(1);
  await asyncAtom1Promise;

  expect(eventResults[0].initialized?.type).toBe('initialized');
  expect(eventResults[0].initialized?.value).toBe(1);

  expect(instance.status.type).toBe('stable');

  const value1 = await namedStore(testStoreName).state(asyncAtom1).getAsync();
  expect(value1).toBe(1);

  
  // [set 2]
  const [set2Promise, set2Resolve] = managedPromise<number>();

  state.set(set2Promise);

  expect(eventResults[1].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(1);
  expect((instance.status as any).abortRequest).toBe(false);

  set2Resolve(2);
  await set2Promise;

  expect(eventResults[2].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[2].changedByPromise?.oldValue).toBe(1);
  expect(eventResults[2].changedByPromise?.newValue).toBe(2);

  expect(instance.status.type).toBe('stable');

  const value2 = await namedStore(testStoreName).state(asyncAtom1).getAsync();
  expect(value2).toBe(2);

  // cancel 3 and set 4
  const [set3Promise] = managedPromise<number>();

  state.set(set3Promise);

  expect(eventResults[3].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(2);
  expect((instance.status as any).abortRequest).toBe(false);

  const [set4Promise, set4Resolve] = managedPromise<number>();

  state.set(set4Promise);

  expect(eventResults[4].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(2);
  expect((instance.status as any).abortRequest).toBe(false);

  set4Resolve(4);
  await set4Resolve;

  expect(eventResults[5].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[5].changedByPromise?.oldValue).toBe(2);
  expect(eventResults[5].changedByPromise?.newValue).toBe(4);

  expect(instance.status.type).toBe('stable');

  const value4 = await namedStore(testStoreName).state(asyncAtom1).getAsync();
  expect(value4).toBe(4);

  // [set throw error]
  state.set(async () => {throw new Error('test error')});

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(4);
  expect((instance.status as any).abortRequest).toBe(false);

  await (instance.status as any).promise;

  expect(eventResults[7].error?.type).toBe('error');
  expect(instance.status.type).toBe('error');

  //105
  const [set5Promise, set5Resolve] = managedPromise<number>();

  state.set(set5Promise);

  expect(eventResults[8].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(undefined);
  expect((instance.status as any).abortRequest).toBe(false);

  set5Resolve(5);
  await set5Promise;

  expect(eventResults[9].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[9].changedByPromise?.oldValue).toBe(undefined);
  expect(eventResults[9].changedByPromise?.newValue).toBe(5);

  expect(instance.status.type).toBe('stable');

  const value3 = await namedStore(testStoreName).state(asyncAtom1).getAsync();
  expect(value3).toBe(5);
});

const syncSelector1 = selector({
  name: 'syncSelector1',
  get: ({get}) => get(syncAtom1) + 100
})

test('SyncSelector Event And Status', () => {
  const state = namedStore(testStoreName).state(syncSelector1);
  const instance = state.instance;
  expect(instance.status.type).toBe('stable');

  const eventResults = instanceEventHistory(instance);

  // 101
  const sourceAtom = namedStore(testStoreName).state(syncAtom1);
  sourceAtom.set(1);

  expect(eventResults[0].changed?.type).toBe('change');
  expect(eventResults[0].changed?.oldValue).toBe(100);
  expect(eventResults[0].changed?.newValue).toBe(101);

  expect(instance.status.type).toBe('stable');

  expect(namedStore(testStoreName).state(syncSelector1).get()).toBe(101);

  // error
  sourceAtom.set(() => {throw new Error('test error')});

  expect(eventResults[1].error?.type).toBe('error');

  expect(instance.status.type).toBe('error');

  expect(() => namedStore(testStoreName).state(syncSelector1).get()).toThrow();

  // 102
  sourceAtom.set(2);

  expect(eventResults[2].changed?.type).toBe('change');
  expect(eventResults[2].changed?.oldValue).toBe(undefined);
  expect(eventResults[2].changed?.newValue).toBe(102);

  expect(instance.status.type).toBe('stable');

  expect(namedStore(testStoreName).state(syncSelector1).get()).toBe(102);
});

const asyncAtom2 = atom({
  name: 'asyncAtom2',
  asyncDefault: () => asyncAtom1Promise
});

const [_, asyncAtom2Resolve] = managedPromise<number>()

const asyncSelector1 = selector({
  name: 'syncSelector1',
  getAsync: async ({get}) => {
    const atomValue = await get(asyncAtom2);
    return atomValue + 100;
  }
});

test('AsyncSelector Event And Status', async () => { 

  // initialize - 101
  const state = namedStore(testStoreName).state(asyncSelector1);
  const instance = state.instance;
  expect(instance.status.type).toBe('waiting for initialize');

  const sourceInstance = namedStore(testStoreName).state(asyncAtom2);

  const eventResults = instanceEventHistory(instance);

  asyncAtom2Resolve(1);
  await (instance.status as any).promise;

  expect(eventResults[0].initialized?.type).toBe('initialized');
  expect(eventResults[0].initialized?.value).toBe(101);

  expect(instance.status.type).toBe('stable');

  const value1 = await namedStore(testStoreName).state(asyncSelector1).getAsync();
  expect(value1).toBe(101);

  // 102
  const [set2Promise, set2Resolve] = managedPromise<number>();

  sourceInstance.set(set2Promise);

  expect(eventResults[1].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(101);
  expect((instance.status as any).abortRequest).toBe(false);

  set2Resolve(2);
  await (instance.status as any).promise;

  expect(eventResults[2].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[2].changedByPromise?.oldValue).toBe(101);
  expect(eventResults[2].changedByPromise?.newValue).toBe(102);

  expect(instance.status.type).toBe('stable');

  const value2 = await namedStore(testStoreName).state(asyncSelector1).getAsync();
  expect(value2).toBe(102);

  // cancel 103 and set 104
  const [set3Promise] = managedPromise<number>();
  sourceInstance.set(set3Promise);

  expect(eventResults[3].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(102);
  expect((instance.status as any).abortRequest).toBe(false);

  const [set4Promise, set4Resolve] = managedPromise<number>();
  sourceInstance.set(set4Promise)

  expect(eventResults[4].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(102);
  expect((instance.status as any).abortRequest).toBe(false);

  set4Resolve(4);
  await (instance.status as any).promise;

  expect(eventResults[5].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[5].changedByPromise?.oldValue).toBe(102);
  expect(eventResults[5].changedByPromise?.newValue).toBe(104);

  expect(instance.status.type).toBe('stable');

  const value4 = await namedStore(testStoreName).state(asyncSelector1).getAsync();
  expect(value4).toBe(104);

  // set throw error
  sourceInstance.set(async () => {throw new Error('test error')});

  expect(eventResults[6].waiting?.type).toBe('waiting');;

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(104);
  expect((instance.status as any).abortRequest).toBe(false);

  await (instance.status as any).promise;

  expect(eventResults[7].error?.type).toBe('error');
  expect(instance.status.type).toBe('error');

  expect(async () => await namedStore(testStoreName).state(asyncSelector1).getAsync()).rejects.toThrow();

  // 105
  const [set5Promise, set5Resolve] = managedPromise<number>();

  sourceInstance.set(set5Promise);

  expect(eventResults[8].waiting?.type).toBe('waiting');

  expect(instance.status.type).toBe('waiting');
  expect((instance.status as any).oldValue).toBe(undefined);
  expect((instance.status as any).abortRequest).toBe(false);

  set5Resolve(5);
  await (instance.status as any).promise;

  expect(eventResults[9].changedByPromise?.type).toBe('change by promise');
  expect(eventResults[9].changedByPromise?.oldValue).toBe(undefined);
  expect(eventResults[9].changedByPromise?.newValue).toBe(105);

  expect(instance.status.type).toBe('stable');

  const value3 = await namedStore(testStoreName).state(asyncSelector1).getAsync();
  expect(value3).toBe(105);
});