import {AsyncAtom, AsyncAtomFamily, AsyncAtomFamilyFunction, AsyncSelector, AsyncSelectorFamily, AsyncSelectorFamilyFunction, SyncAtom, SyncAtomFamily, SyncAtomFamilyFunction, SyncSelector, SyncSelectorFamily, SyncSelectorFamilyFunction, atom, atomFamily, selector, selectorFamily} from '../src'
import { expectType, TypeEqual } from "ts-expect";
import './testUtil';

type TestType = {a: number, b: string}

test('atom typeCheck', () => {
  const atom1 = atom({
    name: 'atom1',
    default: 0
  });
  expectType<TypeEqual<SyncAtom<number>, typeof atom1>>(true);

  const atom2 = atom({
    name: 'atom2',
    default: {a: 0, b: ''},
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    }
  });
  expectType<TypeEqual<SyncAtom<TestType>, typeof atom2>>(true);

  const atom3 = atom({
    name: 'atom3',
    default: () => ({a: 0,b: ''}),
  });
  expectType<TypeEqual<SyncAtom<TestType>, typeof atom3>>(true);

  const atom4 = atom({
    name: 'atom4',
    asyncDefault: new Promise<TestType>(resolve => resolve({a: 0,b: ''})),
  });
  expectType<TypeEqual<AsyncAtom<TestType>, typeof atom4>>(true);

  const atom5 = atom({
    name: 'atom5',
    asyncDefault: async () => ({a: 0,b: ''}),
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    }
  });

  expectType<TypeEqual<AsyncAtom<TestType>, typeof atom5>>(true);

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
  expectType<TypeEqual<SyncAtomFamilyFunction<number, unknown>, typeof atomFamily1>>(true);
  expectType<TypeEqual<SyncAtomFamily<number, unknown>, typeof atomFamily1Sample>>(true);

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
  expectType<TypeEqual<SyncAtomFamilyFunction<TestType, number>, typeof atomFamily2>>(true);
  expectType<TypeEqual<SyncAtomFamily<TestType, number>, typeof atomFamily2Sample>>(true);

  const atomFamily3 = atomFamily<TestType, number>({
    name: 'atomFamily3',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
  });
  const atomFamily3Sample = atomFamily3(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number>, typeof atomFamily3>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number>, typeof atomFamily3Sample>>(true);

  const atomFamily4 = atomFamily<TestType, number>({
    name: 'atomFamily4',
    asyncDefault: async (para) => {
      expectType<TypeEqual<number, typeof para>>(true);
      return {a: para, b: ''}
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType, typeof current>>(true);
      return old === current;
    }
  });
  const atomFamily4Sample = atomFamily4(0);
  expectType<TypeEqual<AsyncAtomFamilyFunction<TestType, number>, typeof atomFamily4>>(true);
  expectType<TypeEqual<AsyncAtomFamily<TestType, number>, typeof atomFamily4Sample>>(true);
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
  expectType<TypeEqual<SyncSelector<TestType2>, typeof selector1>>(true);

  const selector2 = selector({
    name: 'selector2',
    get: ({get}) => {
      const a = get(atom1);
      const b = get(atom2);
      const c = get(atom3);
      expectType<TypeEqual<number, typeof a>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      return {a,b,c};
    },
    compare: (old,current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    }
  });
  expectType<TypeEqual<SyncSelector<TestType2>, typeof selector2>>(true);

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
    }
  });
  expectType<TypeEqual<AsyncSelector<TestType2>, typeof selector3>>(true);

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
    }
  });
  expectType<TypeEqual<AsyncSelector<TestType2>, typeof selector4>>(true);

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
  expectType<TypeEqual<SyncSelectorFamilyFunction<TestType2, number>, typeof selectorFamily1>>(true);
  expectType<TypeEqual<SyncSelectorFamily<TestType2, number>, typeof selectorFamily1Sample>>(true);

  const selectorFamily2 = selectorFamily<TestType2, number>({
    name: 'selectorFamily2',
    get: ({get,param}) => {
      const b = get(atom1);
      const c = get(atom2);
      expectType<TypeEqual<number, typeof param>>(true);
      expectType<TypeEqual<string, typeof b>>(true);
      expectType<TypeEqual<boolean, typeof c>>(true);
      return {a: param, b, c};
    },
    compare: (old, current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    }
  });
  const selectorFamily2Sample = selectorFamily2(0);
  expectType<TypeEqual<SyncSelectorFamilyFunction<TestType2, number>, typeof selectorFamily2>>(true);
  expectType<TypeEqual<SyncSelectorFamily<TestType2, number>, typeof selectorFamily2Sample>>(true);

  const selectorFamily3 = selectorFamily<TestType2, number>({
    name: 'selectorFamily3',
    getAsync: async ({get, param}) => {
      const bPromise = get(atom1);
      const cPromise = get(atom2);
      expectType<TypeEqual<number, typeof param>>(true);
      expectType<TypeEqual<Promise<string>, typeof bPromise>>(true);
      expectType<TypeEqual<Promise<boolean>, typeof cPromise>>(true);
      const b = await bPromise;
      const c = await cPromise;
      return {a: param,b,c};
    },
    compare: (old, current) => {
      expectType<TypeEqual<TestType2 | undefined, typeof old>>(true);
      expectType<TypeEqual<TestType2, typeof current>>(true);
      return old === current;
    }
  });
  const selectorFamily3Sample = selectorFamily3(0);
  expectType<TypeEqual<AsyncSelectorFamilyFunction<TestType2, number>, typeof selectorFamily3>>(true);
  expectType<TypeEqual<AsyncSelectorFamily<TestType2, number>, typeof selectorFamily3Sample>>(true);
});