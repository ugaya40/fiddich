import { deleteNamedStoreIfExists, eventPublisher, independentAtom, namedStore } from "../src";
import { StableStatus } from "../src/shareTypes";
import { instanceEventHistory } from "./testUtil";

const testEvent = eventPublisher<number>();

const atom1 = independentAtom({
  name: 'test',
  default: `result:0`,
  registerTrigger: (change) => {
    const listener = testEvent.addListener(i => change(`result:${i}`));
    return () => listener.dispose();
  }
});

test('independentAtom basic', () => {
  const store = 'testStore';
  
  testEvent.emit(1);

  const state1 = namedStore(store).state(atom1);
  const instance1 = state1.instance;
  const eventResults1 = instanceEventHistory(instance1);

  expect(instance1.status.type).toBe('stable');
  expect(namedStore(store).state(atom1).get()).toBe(`result:0`);

  // basic change 1
  testEvent.emit(2);

  expect(eventResults1[0].changed?.type).toBe('change');
  expect(eventResults1[0].changed?.oldValue).toBe(`result:0`);
  expect(eventResults1[0].changed?.newValue).toBe(`result:2`);

  expect(instance1.status.type).toBe('stable');
  expect(namedStore(store).state(atom1).get()).toBe(`result:2`);

  // not change
  testEvent.emit(2);

  expect(eventResults1.length).toBe(1);

  // basic change 2
  testEvent.emit(3);

  expect(eventResults1[1].changed?.type).toBe('change');
  expect(eventResults1[1].changed?.oldValue).toBe(`result:2`);
  expect(eventResults1[1].changed?.newValue).toBe(`result:3`);

  expect(instance1.status.type).toBe('stable');
  expect(namedStore(store).state(atom1).get()).toBe(`result:3`);

  // store finalize
  deleteNamedStoreIfExists(store);
  testEvent.emit(4);

  expect(eventResults1.length).toBe(2);
  expect(instance1.status.type).toBe('stable');
  expect((instance1.status as StableStatus<string>).value).toBe('result:3');

  expect(namedStore(store).state(atom1).get()).toBe(`result:0`);
});