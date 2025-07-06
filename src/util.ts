export type Compare<T> = (prev: T, newValue: T) => boolean;

export const defaultCompare: Compare<any> = (prev: any, newValue: any): boolean => Object.is(prev, newValue);

export function assertUnreachable(x: never): never {
  throw new Error(`unexpected value reached: ${JSON.stringify(x)}`);
}

export function isDisposable(value: any): value is Disposable {
  return value != null && typeof value === 'object' && Symbol.dispose in value && typeof value[Symbol.dispose] === 'function';
}

let counter = 0;
export function generateStateId(): string {
  counter++;
  return `${counter}`;
}

export interface ScopedCollector<TUnit, TItem, TStore> {
  setScope(scope: Record<string, never>): void;
  collect(unit: TUnit, item: TItem): void;
  exitScope(scope: Record<string, never>): void;
  isRoot(scope: Record<string, never>) : boolean;
  getStore(unit: TUnit): TStore;
}

export interface ScopedCollectorConfig<TUnit, TItem, TStore> {
  createStoreForUnit: (unit: TUnit) => TStore;
  processItem: (unit: TUnit, store: TStore, item: TItem) => void;
}

export function createScopedCollector<TUnit, TItem, TStore>(
  config: ScopedCollectorConfig<TUnit, TItem, TStore>
): ScopedCollector<TUnit, TItem, TStore> {

  let rootScope: Record<string, never> | null = null;
  const map = new Map<TUnit, TStore>();
  
  const setScope = (scope: Record<string, never>): void => {
    if (rootScope === null) {
      rootScope = scope;
    }
  };
  
  const collect = (unit: TUnit, item: TItem): void => {
    if (rootScope === null) {
      throw new Error('No active scope. Call setScope before collect.');
    }
    
    let store = map.get(unit);
    if (!store) {
      store = config.createStoreForUnit(unit);
      map.set(unit, store);
    }
    
    config.processItem(unit, store, item);
  };
  
  const exitScope = (scope: Record<string, never>): void => {
    if (scope === rootScope) {
      map.clear();
      rootScope = null;
    }
  };

  const getStore = (unit: TUnit) => {
    let store = map.get(unit);
    if (store == null) {
      store = config.createStoreForUnit(unit);
      map.set(unit,store);
    }
    return store;
  };

  const isRoot = (scope: Record<string, never>) => rootScope === scope;
  
  return {
    setScope,
    collect,
    exitScope,
    getStore,
    isRoot
  };
}
