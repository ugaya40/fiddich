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

export interface ScopedCollector<TUnit, TItem, TResult> {
  setScope(scope: Record<string, never>): void;
  collect(unit: TUnit, item: TItem): void;
  exitScope(scope: Record<string, never>): TResult | null;
}

export interface ScopedCollectorConfig<TUnit, TItem, TStore, TResult> {
  createStoreForUnit: (unit: TUnit) => TStore;
  processItem: (unit: TUnit, store: TStore, item: TItem) => void;
  createResult: (map: Map<TUnit, TStore>) => TResult;
}

export function createScopedCollector<TUnit, TItem, TStore, TResult>(
  config: ScopedCollectorConfig<TUnit, TItem, TStore, TResult>
): ScopedCollector<TUnit, TItem, TResult> {
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
  
  const exitScope = (scope: Record<string, never>): TResult | null => {
    if (scope === rootScope) {
      const result = config.createResult(map);
      map.clear();
      rootScope = null;
      return result;
    }
    return null;
  };
  
  return {
    setScope,
    collect,
    exitScope
  };
}
