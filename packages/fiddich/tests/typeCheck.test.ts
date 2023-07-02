import {AsyncAtom, AsyncAtomFamily, AsyncAtomFamilyFunction, AsyncSelector, AsyncSelectorFamily, AsyncSelectorFamilyFunction, CleanupCell, SyncAtom, SyncAtomFamily, SyncAtomFamilyFunction, SyncSelector, SyncSelectorFamily, SyncSelectorFamilyFunction, atom, atomFamily, eventPublisher, independentAtom, independentAtomFamily, selector, selectorFamily} from '../src'
import { expectType, TypeEqual } from "ts-expect";
import './testUtil';

type TestType = {a: number, b: string}
type TestCellType = {c: string, d: number}

test('atom typeCheck', () => {
  const atom1 = atom({
    name: 'atom1',
    default: 0
  });
  expectType<TypeEqual<SyncAtom<number, undefined>, typeof atom1>>(true);

  const atom2 = atom({
    name: 'atom2',
    default: {a: 0, b: ''},
    cell: () => ({
      c: '',
      d: 0
    }),
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  expectType<TypeEqual<SyncAtom<TestType, TestCellType>, typeof atom2>>(true);

  const atom3 = atom({
    name: 'atom3',
    default: () => ({a: 0,b: ''}),
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  expectType<TypeEqual<SyncAtom<TestType, TestCellType>, typeof atom3>>(true);

  const atom4 = atom({
    name: 'atom4',
    asyncDefault: new Promise<TestType>(resolve => resolve({a: 0,b: ''})),
  });
  expectType<TypeEqual<AsyncAtom<TestType, undefined>, typeof atom4>>(true);

  const atom5 = atom({
    name: 'atom5',
    asyncDefault: async () => ({a: 0,b: ''}),
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });

  expectType<TypeEqual<AsyncAtom<TestType, TestCellType>, typeof atom5>>(true);

  //@ts-expect-error
  const errorSyncAtom = atom({
    name: 'errorSyncAtom',
    default: async () => 0 
  });

});

test('atomFamily typeCheck', () => {
  const atomFamily1 = atomFamily({
    name: 'atomFamily1',
    default: 0
  });
  const atomFamily1Sample = atomFamily1('');
  expectType<TypeEqual<SyncAtomFamilyFunction<number, unknown, undefined>, typeof atomFamily1>>(true);
  expectType<TypeEqual<SyncAtomFamily<number, unknown, undefined>, typeof atomFamily1Sample>>(true);

  const atomFamily2 = atomFamily<TestType, number>({
    name: 'atomFamily2',
    default: (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    }
  });
  const atomFamily2Sample = atomFamily2(0);
  expectType<TypeEqual<SyncAtomFamilyFunction<TestType, number, undefined>, typeof atomFamily2>>(true);
  expectType<TypeEqual<SyncAtomFamily<TestType, number, undefined>, typeof atomFamily2Sample>>(true);

  const atomFamily3 = atomFamily<TestType, number, TestCellType>({
    name: 'atomFamily3',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  const atomFamily3Sample = atomFamily3(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number, TestCellType>, typeof atomFamily3>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number, TestCellType>, typeof atomFamily3Sample>>(true);

  const atomFamily4 = atomFamily<TestType, number, TestCellType>({
    name: 'atomFamily4',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  const atomFamily4Sample = atomFamily4(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number, TestCellType>, typeof atomFamily4>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number, TestCellType>, typeof atomFamily4Sample>>(true);
});

type TestType2 = {a: number, b: string, c: boolean};

test('selector typeCheck', () => {

  const atom1 = atom({name: 'atom1',  default: 0});
  const atom2 = atom({name: 'atom2',  default: ''});
  const atom3 = atom({name: 'atom3',  default: true});

  const selector1 = selector({
    name: 'selector1',
    get: ({get}) => {
      const a = get(atom1);
      const b = get(atom2);
      const c = get(atom3);
      expectType<TypeEqual<number, typeof a>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      return {a,b,c};
    }
  });
  expectType<TypeEqual<SyncSelector<TestType2, undefined>, typeof selector1>>(true);

  const selector2 = selector({
    name: 'selector2',
    get: ({get, cell}) => {
      const a = get(atom1);
      const b = get(atom2);
      const c = get(atom3);
      expectType<TypeEqual<number, typeof a>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      expectType<TypeEqual<TestCellType, typeof cell>>(true);
      return {a,b,c};
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  expectType<TypeEqual<SyncSelector<TestType2, TestCellType>, typeof selector2>>(true);

  const selector3 = selector({
    name: 'selector3',
    getAsync: async ({get}) => {
      const aPromise = get(atom1);
      const bPromise = get(atom2);
      const cPromise = get(atom3);
      expectType<TypeEqual<Promise<number>, typeof aPromise>>(true);
      expectType<TypeEqual<Promise<string>, typeof bPromise>>(true);
      expectType<TypeEqual<Promise<boolean>, typeof cPromise>>(true);
      const a = await aPromise;
      const b = await bPromise;
      const c = await cPromise;
      return {a,b,c};
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  expectType<TypeEqual<AsyncSelector<TestType2, TestCellType>, typeof selector3>>(true);

  const selector4 = selector({
    name: 'selector4',
    getAsync: async ({get}) => {
      const a: number = await get(atom1);
      const b: string = await get(atom2);
      const c: boolean = await get(atom3);
      return {a,b,c};
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  expectType<TypeEqual<AsyncSelector<TestType2, TestCellType>, typeof selector4>>(true);

  //@ts-expect-error
  const errorSyncSelector = selector({
    name: 'errorSyncSelector',
    get: async () => 3
  })
});

test('selectorFamily typeCheck', () => {

  const atom1 = atom({name: 'atom2',  default: ''});
  const atom2 = atom({name: 'atom3',  default: true});

  const selectorFamily1 = selectorFamily<TestType2, number>({
    name: 'selectorFamily1',
    get: ({get,param}) => {
      const b = get(atom1);
      const c = get(atom2);
      expectType<TypeEqual<number, typeof param>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      return {a: param, b, c};
    }
  });
  const selectorFamily1Sample = selectorFamily1(0);
  expectType<TypeEqual<SyncSelectorFamilyFunction<TestType2, number, undefined>, typeof selectorFamily1>>(true);
  expectType<TypeEqual<SyncSelectorFamily<TestType2, number, undefined>, typeof selectorFamily1Sample>>(true);

  const selectorFamily2 = selectorFamily<TestType2, number, TestCellType>({
    name: 'selectorFamily2',
    get: ({get, param, cell}) => {
      const b = get(atom1);
      const c = get(atom2);
      expectType<TypeEqual<number, typeof param>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      expectType<TypeEqual<TestCellType, typeof cell>>(true);
      return {a: param, b, c};
    },
    compare: (old, current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  const selectorFamily2Sample = selectorFamily2(0);
  expectType<TypeEqual<SyncSelectorFamilyFunction<TestType2, number, TestCellType>, typeof selectorFamily2>>(true);
  expectType<TypeEqual<SyncSelectorFamily<TestType2, number, TestCellType>, typeof selectorFamily2Sample>>(true);

  const selectorFamily3 = selectorFamily<TestType2, number, TestCellType>({
    name: 'selectorFamily3',
    getAsync: async ({get, param, cell}) => {
      const bPromise = get(atom1);
      const cPromise = get(atom2);
      expectType<TypeEqual<number, typeof param>>(true);
      expectType<TypeEqual<Promise<string>, typeof bPromise>>(true);
      expectType<TypeEqual<Promise<boolean>, typeof cPromise>>(true);
      expectType<TypeEqual<TestCellType, typeof cell>>(true);
      const b = await bPromise;
      const c = await cPromise;
      return {a: param,b,c};
    },
    compare: (old, current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    },
    cell: () => ({
      c: '',
      d: 0
    }),
    effects: {
      init: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      change: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      finalize: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
      error: ({cell}) => expectType<TypeEqual<TestCellType, typeof cell>>(true),
    }
  });
  const selectorFamily3Sample = selectorFamily3(0);
  expectType<TypeEqual<AsyncSelectorFamilyFunction<TestType2, number, TestCellType>, typeof selectorFamily3>>(true);
  expectType<TypeEqual<AsyncSelectorFamily<TestType2, number, TestCellType>, typeof selectorFamily3Sample>>(true);
});

test('independentAtom typeCheck', () => {
  const event1 = eventPublisher<number>();
  const atom1 = independentAtom({
    name: 'atom1',
    default: 0,
    registerTrigger: change => {
      const listener = event1.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  expectType<TypeEqual<SyncAtom<number, CleanupCell>, typeof atom1>>(true);

  const event2 = eventPublisher<TestType>();
  const atom2 = independentAtom({
    name: 'atom2',
    default: {a: 0, b: ''},
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    registerTrigger: change => {
      const listener = event2.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  expectType<TypeEqual<SyncAtom<TestType, CleanupCell>, typeof atom2>>(true);

  const event3 = eventPublisher<TestType>();
  const atom3 = independentAtom({
    name: 'atom3',
    default: () => ({a: 0,b: ''}),
    registerTrigger: change => {
      const listener = event3.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  expectType<TypeEqual<SyncAtom<TestType, CleanupCell>, typeof atom3>>(true);

  const event4 = eventPublisher<TestType>();
  const atom4 = independentAtom({
    name: 'atom4',
    asyncDefault: new Promise<TestType>(resolve => resolve({a: 0,b: ''})),
    registerTrigger: change => {
      const listener = event4.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  expectType<TypeEqual<AsyncAtom<TestType, CleanupCell>, typeof atom4>>(true);

  const event5 = eventPublisher<TestType>();
  const atom5 = independentAtom({
    name: 'atom5',
    asyncDefault: async () => ({a: 0,b: ''}),
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    registerTrigger: change => {
      const listener = event5.addListener(i => change(i));
      return () => listener.dispose();
    }
  });

  expectType<TypeEqual<AsyncAtom<TestType, CleanupCell>, typeof atom5>>(true);

  //@ts-expect-error
  const errorSyncAtom = independentAtom({
    name: 'errorSyncAtom',
    default: async () => 0 
  });

});

test('independentAtomFamily typeCheck', () => {
  const event1 = eventPublisher<number>();
  const atomFamily1 = independentAtomFamily({
    name: 'atomFamily1',
    default: 0,
    registerTrigger: change => {
      const listener = event1.addListener(i => change(i));
      return () => listener.dispose();
    }
  });

  const atomFamily1Sample = atomFamily1('');
  expectType<TypeEqual<SyncAtomFamilyFunction<number, unknown, CleanupCell>, typeof atomFamily1>>(true);
  expectType<TypeEqual<SyncAtomFamily<number, unknown, CleanupCell>, typeof atomFamily1Sample>>(true);

  const event2 = eventPublisher<TestType>();
  const atomFamily2 = independentAtomFamily<TestType, number>({
    name: 'atomFamily2',
    default: (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    registerTrigger: change => {
      const listener = event2.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  const atomFamily2Sample = atomFamily2(0);
  expectType<TypeEqual<SyncAtomFamilyFunction<TestType, number, CleanupCell>, typeof atomFamily2>>(true);
  expectType<TypeEqual<SyncAtomFamily<TestType, number, CleanupCell>, typeof atomFamily2Sample>>(true);

  const event3 = eventPublisher<TestType>();
  const atomFamily3 = independentAtomFamily<TestType, number>({
    name: 'atomFamily3',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    registerTrigger: change => {
      const listener = event3.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  const atomFamily3Sample = atomFamily3(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number, CleanupCell>, typeof atomFamily3>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number, CleanupCell>, typeof atomFamily3Sample>>(true);

  const event4 = eventPublisher<TestType>();
  const atomFamily4 = independentAtomFamily<TestType, number>({
    name: 'atomFamily4',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    },
    registerTrigger: change => {
      const listener = event4.addListener(i => change(i));
      return () => listener.dispose();
    }
  });
  const atomFamily4Sample = atomFamily4(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number, CleanupCell>, typeof atomFamily4>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number, CleanupCell>, typeof atomFamily4Sample>>(true);
});